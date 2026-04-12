-- 1. TABEL OPERATOR
CREATE TABLE operators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE
);

-- 2. TABEL SESI SHIFT (Menyimpan Header Inbound)
CREATE TABLE shift_sessions (
    id TEXT PRIMARY KEY, -- Gunakan UUID/CUID dari Frontend/Backend
    shift_number INTEGER NOT NULL, -- 1 atau 2
    date_opened DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_closed DATETIME,
    bahan_baku_a_karung INTEGER DEFAULT 0,
    sisa_sablon_a_karung INTEGER DEFAULT 0,
    pp_hijau_muda_kg REAL DEFAULT 0,
    sapuan_kg REAL DEFAULT 0,
    sapuan_kotor_kg REAL DEFAULT 0,
    admin_name TEXT DEFAULT '-',
    jumlah_karyawan INTEGER DEFAULT 0,
    status TEXT DEFAULT 'OPEN' -- 'OPEN' atau 'CLOSED'
);

-- 3. TABEL WASTE PER MESIN
CREATE TABLE machine_wastes (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    machine_number INTEGER NOT NULL, -- 1 sampai 7
    afalan_kg REAL DEFAULT 0,
    prongkalan_kg REAL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES shift_sessions(id) ON DELETE CASCADE
);

-- 4. TABEL ROLL RAFIA (Paling sering diakses)
CREATE TABLE rolls (
    id TEXT PRIMARY KEY,
    roll_code TEXT NOT NULL UNIQUE, -- Contoh: YSX-68.9-RA
    weight_kg REAL NOT NULL,
    operator_code TEXT NOT NULL,
    machine_number INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    status TEXT DEFAULT 'IN_STOCK', -- 'IN_STOCK' atau 'SOLD'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES shift_sessions(id) ON DELETE CASCADE
);

-- Indexing untuk mempercepat fitur SEARCH di Vercel (sangat penting untuk optimasi runtime)
CREATE INDEX idx_rolls_status ON rolls(status);
CREATE INDEX idx_rolls_code ON rolls(roll_code);

-- 5. TABEL SALES (Menyimpan Header Outbound/Penjualan)
CREATE TABLE sales (
    id TEXT PRIMARY KEY,
    pic_name TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    nopol TEXT,
    sale_datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_weight_kg REAL DEFAULT 0,
    total_rolls INTEGER DEFAULT 0
);

-- 6. TABEL SALE ITEMS (Many-to-Many untuk Roll yang dijual)
CREATE TABLE sale_items (
    sale_id TEXT NOT NULL,
    roll_id TEXT NOT NULL,
    PRIMARY KEY (sale_id, roll_id),
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (roll_id) REFERENCES rolls(id) ON DELETE RESTRICT
);

-- 7. TABEL SYSTEM STATS (Optimasi Kritis: Menyimpan Total Stok agar tidak perlu SUM() ribuan data)
CREATE TABLE system_stats (
    id INTEGER PRIMARY KEY CHECK (id = 1), -- Memaksa hanya ada 1 baris
    current_stock_kg REAL DEFAULT 0,
    current_hr_kg REAL DEFAULT 0,
    current_month_year TEXT
);

-- Inisialisasi baris pertama untuk system_stats
INSERT INTO system_stats (id, current_stock_kg, current_hr_kg, current_month_year) 
VALUES (1, 0, 0, '10-2023');