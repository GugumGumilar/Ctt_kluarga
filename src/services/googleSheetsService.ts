import { ExpenseItem } from '../types';

export const SPREADSHEET_TITLE = 'CatatBelanja - Pengeluaran Rumah Tangga';
export const SHEET_NAME = 'Daftar Belanja';

export const SHEET_HEADERS = [
  'ID Transaksi',
  'Tanggal',
  'Waktu',
  'Toko / Merchant',
  'Nama Item Belanjaan',
  'Kategori',
  'Qty',
  'Harga Satuan (Rp)',
  'Diskon (Rp)',
  'Total Harga (Rp)',
  'Metode Pembayaran',
  'No. Struk',
  'Sumber Input',
  'Catatan / Keterangan',
  'Waktu Dicatat',
];

export interface GoogleDriveFile {
  id: string;
  name: string;
  webViewLink?: string;
  modifiedTime?: string;
}

/**
 * Find existing CatatBelanja spreadsheet in user's Google Drive
 */
export async function findExistingSpreadsheet(accessToken: string): Promise<GoogleDriveFile | null> {
  const query = encodeURIComponent(`name='${SPREADSHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink,modifiedTime)&orderBy=modifiedTime desc`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal mencari spreadsheet di Google Drive');
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

/**
 * Create a new Google Spreadsheet in Google Drive with styled headers
 */
export async function createHouseholdSpreadsheet(
  accessToken: string,
  initialItems: ExpenseItem[] = []
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: SPREADSHEET_TITLE,
      },
      sheets: [
        {
          properties: {
            title: SHEET_NAME,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal membuat Google Spreadsheet baru di Google Drive.');
  }

  const createData = await createRes.json();
  const spreadsheetId = createData.spreadsheetId;
  const spreadsheetUrl = createData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write header and initial items
  await syncAllItemsToGoogleSheets(accessToken, spreadsheetId, initialItems);

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Format ExpenseItem array to rows for Google Sheets
 */
function formatItemsToRows(items: ExpenseItem[]): (string | number)[][] {
  return items.map((item) => [
    item.id || '',
    item.date || '',
    item.time || '',
    item.storeName || '',
    item.itemName || '',
    item.category || '',
    Number(item.quantity) || 1,
    Number(item.unitPrice) || 0,
    Number(item.discount) || 0,
    Number(item.totalPrice) || 0,
    item.paymentMethod || '',
    item.receiptNumber || '-',
    item.source || 'MANUAL',
    item.notes || '',
    item.createdAt || new Date().toISOString(),
  ]);
}

/**
 * Push all local items to Google Sheets (overwriting sheet data to keep in sync)
 */
export async function syncAllItemsToGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  items: ExpenseItem[]
): Promise<void> {
  const range = `'${SHEET_NAME}'!A1:O`;
  const allRows = [SHEET_HEADERS, ...formatItemsToRows(items)];

  // Clear first or overwrite range
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: allRows,
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal menyinkronkan data ke Google Sheets');
  }
}

/**
 * Append single or multiple new items to the bottom of the Google Sheet
 */
export async function appendItemsToGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  items: ExpenseItem[]
): Promise<void> {
  if (items.length === 0) return;
  const range = `'${SHEET_NAME}'!A:O`;
  const rows = formatItemsToRows(items);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal menambahkan baris ke Google Sheets.');
  }
}

/**
 * Pull/read items from Google Sheets to sync changes made by spouse
 */
export async function pullItemsFromGoogleSheets(
  accessToken: string,
  spreadsheetId: string
): Promise<ExpenseItem[]> {
  const range = `'${SHEET_NAME}'!A2:O`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal membaca data dari Google Sheets.');
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  const items: ExpenseItem[] = rows
    .filter((r) => r.length >= 5 && r[4]) // Item name must exist
    .map((r, idx) => ({
      id: r[0] ? String(r[0]) : `imported-${Date.now()}-${idx}`,
      date: r[1] ? String(r[1]) : new Date().toISOString().split('T')[0],
      time: r[2] ? String(r[2]) : '12:00',
      storeName: r[3] ? String(r[3]) : 'Toko',
      itemName: String(r[4]),
      category: r[5] ? String(r[5]) : 'Kebutuhan Rumah',
      quantity: Number(r[6]) || 1,
      unitPrice: Number(r[7]) || 0,
      discount: Number(r[8]) || 0,
      totalPrice: Number(r[9]) || Math.max(0, (Number(r[6]) || 1) * (Number(r[7]) || 0) - (Number(r[8]) || 0)),
      paymentMethod: r[10] ? String(r[10]) : 'Tunai',
      receiptNumber: r[11] ? String(r[11]) : '-',
      source: (r[12] === 'OCR_PHOTO' || r[12] === 'MANUAL' || r[12] === 'BANK_SYNC') ? r[12] : 'MANUAL',
      notes: r[13] ? String(r[13]) : '',
      createdAt: r[14] ? String(r[14]) : new Date().toISOString(),
    }));

  return items;
}

/**
 * Share spreadsheet with wife/family member via Google Drive Permissions API
 */
export async function shareSpreadsheetWithUser(
  accessToken: string,
  spreadsheetId: string,
  emailAddress: string
): Promise<void> {
  const cleanEmail = emailAddress.trim().toLowerCase();

  // Try with email notification first
  let res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?sendNotificationEmail=true&supportsAllDrives=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'writer',
        type: 'user',
        emailAddress: cleanEmail,
      }),
    }
  );

  // If sendNotificationEmail fails (some domains/settings reject 3P notifications), fallback to direct permission grant
  if (!res.ok) {
    res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?sendNotificationEmail=false&supportsAllDrives=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'writer',
          type: 'user',
          emailAddress: cleanEmail,
        }),
      }
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const rawMessage = err.error?.message || '';
    if (rawMessage.toLowerCase().includes('not found') || rawMessage.toLowerCase().includes('invalid')) {
      throw new Error(`Email "${cleanEmail}" tidak ditemukan atau bukan akun Google yang valid.`);
    }
    throw new Error(rawMessage || 'Gagal membagikan spreadsheet ke email istri di Google Drive.');
  }
}
