import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_ASSETS, INITIAL_ROTATIONS, INITIAL_LOCATIONS } from './src/data/initialData';
import {
  generateHistoriMonths,
  computeAssetHistoryMap,
} from './src/utils/assetHistoryColumns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UserLokasiRecord {
  id: string;
  userId: string;
  kodeLokasi: string;
}

interface UserRecord {
  fid: string;
  namaUser: string;
  akses: string;
  isSuperAdmin?: boolean;
  aksesAllLokasi?: boolean;
  lokasiAkses: string[];
}

interface IllegalAccessLog {
  id: string;
  timestamp: string;
  username: string;
  assetCode?: string;
  attemptedLocation?: string;
  actualLocation?: string;
  allowedLocations: string[];
  action: string;
  ip?: string;
}

// In-memory backend database for user location permissions and audit logs
const backendUsers: Map<string, UserRecord> = new Map();
const backendUserLokasiAkses: UserLokasiRecord[] = [];
const illegalAccessLogs: IllegalAccessLog[] = [];

// Seed default admin
backendUsers.set('admin', {
  fid: 'usr_admin_default_01',
  namaUser: 'ADMIN',
  akses: 'ADMINISTRATOR',
  isSuperAdmin: true,
  aksesAllLokasi: true,
  lokasiAkses: INITIAL_LOCATIONS.map((l) => l.code),
});
backendUsers.set('admin', backendUsers.get('admin')!);

/**
 * Global Helper Backend: getLokasiAksesUser
 * Returns array of allowed location codes, or null if superadmin (access to all locations)
 */
function getLokasiAksesUser(username?: string): string[] | null {
  if (!username) return null;
  const user = backendUsers.get(username.toLowerCase().trim());
  if (!user) {
    // If not found in seed, assume restricted or fallback
    return null;
  }
  if (user.isSuperAdmin || user.aksesAllLokasi) {
    return null; // Superadmin: no filter
  }
  return user.lokasiAkses || [];
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API to sync users and user_lokasi_akses from frontend
  app.post('/api/users/sync', (req, res) => {
    try {
      const { users, userLokasiAkses } = req.body;
      if (Array.isArray(users)) {
        users.forEach((u: UserRecord) => {
          if (u.namaUser) {
            backendUsers.set(u.namaUser.toLowerCase().trim(), {
              ...u,
              lokasiAkses: u.lokasiAkses || [],
            });
          }
        });
      }
      if (Array.isArray(userLokasiAkses)) {
        backendUserLokasiAkses.length = 0;
        backendUserLokasiAkses.push(...userLokasiAkses);
      }
      return res.json({ success: true, count: backendUsers.size });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Sync failed' });
    }
  });

  // POST /api/assets/validate-access
  // Validates if a user has permission to access / edit / rotate / delete / search an asset
  app.post('/api/assets/validate-access', (req, res) => {
    try {
      const { assetCode, username, action = 'view' } = req.body;
      if (!assetCode) {
        return res.status(400).json({ error: 'Kode aset wajib diisi' });
      }

      const cleanCode = String(assetCode).trim().toUpperCase();
      const user = username ? backendUsers.get(String(username).toLowerCase().trim()) : null;
      const allowedLocs = getLokasiAksesUser(username);

      // Find the asset in database
      const asset = INITIAL_ASSETS.find((a) => a.code.toUpperCase() === cleanCode);

      if (!asset) {
        return res.json({
          allowed: true,
          found: false,
          message: 'Aset tidak ditemukan dalam database awal',
        });
      }

      // If user is superadmin (allowedLocs === null), allow everything
      if (allowedLocs === null) {
        return res.json({
          allowed: true,
          assetCode: asset.code,
          actualLocation: asset.locationCode,
        });
      }

      // Check if asset's location is inside user's allowed locations
      const hasAccess = allowedLocs.includes(asset.locationCode);

      if (!hasAccess) {
        const errorMsg = `Kode Aset ${asset.code} adalah milik lokasi ${asset.locationCode}. Akun Anda hanya memiliki akses untuk lokasi: ${allowedLocs.join(', ') || 'NONE'}.`;

        // Record illegal access log
        const logEntry: IllegalAccessLog = {
          id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          timestamp: new Date().toISOString(),
          username: username || 'anonymous',
          assetCode: asset.code,
          actualLocation: asset.locationCode,
          allowedLocations: allowedLocs,
          action,
          ip: req.ip,
        };
        illegalAccessLogs.unshift(logEntry);
        if (illegalAccessLogs.length > 500) illegalAccessLogs.pop();

        console.warn(`[403 FORBIDDEN] User '${username}' attempted illegal access to asset '${asset.code}' (location: ${asset.locationCode})`);

        return res.status(403).json({
          status: 403,
          error: 'AKSES DITOLAK',
          message: errorMsg,
          assetCode: asset.code,
          actualLocation: asset.locationCode,
          allowedLocations: allowedLocs,
        });
      }

      return res.json({
        allowed: true,
        assetCode: asset.code,
        actualLocation: asset.locationCode,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Validation error' });
    }
  });

  // GET /api/audit/illegal-access
  app.get('/api/audit/illegal-access', (_req, res) => {
    return res.json(illegalAccessLogs.slice(0, 50));
  });

  // POST /api/audit/illegal-access
  app.post('/api/audit/illegal-access', (req, res) => {
    try {
      const { username, assetCode, actualLocation, allowedLocations, action } = req.body;
      const logEntry: IllegalAccessLog = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        timestamp: new Date().toISOString(),
        username: username || 'anonymous',
        assetCode,
        actualLocation,
        allowedLocations: allowedLocations || [],
        action: action || 'attempted_access',
        ip: req.ip,
      };
      illegalAccessLogs.unshift(logEntry);
      if (illegalAccessLogs.length > 500) illegalAccessLogs.pop();
      return res.json({ success: true, id: logEntry.id });
    } catch {
      return res.status(500).json({ error: 'Failed to record log' });
    }
  });

  // GET /api/assets/history-location
  // Query params: from=2020-01, to=2026-09, lokasi=BEC2 (optional), search=BABY DINO (optional), user=admin (optional)
  app.get('/api/assets/history-location', (req, res) => {
    try {
      const fromParam = (req.query.from as string) || '2020-01';
      const toParam = (req.query.to as string) || '2026-09';
      let lokasiParam = req.query.lokasi as string | undefined;
      const searchParam = req.query.search as string | undefined;
      const usernameParam = (req.query.user || req.headers['x-user-id']) as string | undefined;

      const allowedLocs = getLokasiAksesUser(usernameParam);

      // SECURITY CHECK: If user is restricted, validate requested location
      if (allowedLocs !== null) {
        if (lokasiParam && lokasiParam !== 'ALL') {
          if (!allowedLocs.includes(lokasiParam)) {
            return res.status(403).json({
              status: 403,
              error: 'AKSES DITOLAK',
              message: `Akses ke lokasi ${lokasiParam} ditolak. Akun Anda hanya memiliki akses untuk lokasi: ${allowedLocs.join(', ')}.`,
            });
          }
        } else {
          // If query is ALL or unspecified, automatically restrict to user's first allowed location
          lokasiParam = allowedLocs[0];
        }
      }

      const months = generateHistoriMonths(fromParam, toParam);
      const columns = months.map((m) => m.label);

      let targetAssets = INITIAL_ASSETS;
      let targetRotations = INITIAL_ROTATIONS;

      // Apply location filter (restricted user or specific param)
      if (allowedLocs !== null) {
        targetAssets = targetAssets.filter((a) => allowedLocs.includes(a.locationCode));
      } else if (lokasiParam && lokasiParam !== 'ALL') {
        targetAssets = targetAssets.filter((a) => a.locationCode === lokasiParam);
      }

      // Filter by search query if specified
      if (searchParam && searchParam.trim()) {
        const q = searchParam.trim().toLowerCase();
        targetAssets = targetAssets.filter(
          (a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
        );
      }

      const data = targetAssets.map((asset) => {
        const historyMap = computeAssetHistoryMap(asset, targetRotations, months);
        const historiFormatted: Record<string, string> = {};
        months.forEach((m) => {
          historiFormatted[m.label] = historyMap[m.key] || '';
        });

        return {
          kode_aset: asset.code,
          nama_aset: asset.name,
          histori: historiFormatted,
        };
      });

      return res.json({
        columns,
        data,
      });
    } catch (err: any) {
      console.error('Error in /api/assets/history-location:', err);
      return res.status(500).json({ error: err?.message || 'Internal server error' });
    }
  });

  // =========================================================================
  // FUNCTION REUSABLE BACKEND: v_aset_lokasi_per_periode
  // Menghitung lokasi aktif setiap aset per periode snapshot histori
  // Dipakai bersama oleh Menu 1 (Data Rinci Aset) dan Menu 7.1 (Pendapatan Mesin)
  // =========================================================================
  function v_aset_lokasi_per_periode(
    bulan: number | string,
    tahun: number | string,
    riwayatLokasiOn = true,
    filterLokasi = 'ALL',
    userAllowedLocations: string[] | null = null,
    search?: string
  ) {
    let periodEndNum: number | null = null;
    if (tahun !== 'ALL' && tahun) {
      const y = parseInt(String(tahun), 10);
      const m = bulan === 'ALL' || !bulan ? 12 : parseInt(String(bulan), 10);
      const lastDay = new Date(y, m, 0).getDate();
      periodEndNum = y * 10000 + m * 100 + lastDay;
    }

    let results = INITIAL_ASSETS.map((asset) => {
      const normCode = asset.code.trim().toUpperCase();
      const validRots = INITIAL_ROTATIONS
        .filter((r) => r.assetCode.trim().toUpperCase() === normCode && r.status !== 'DITOLAK' && r.status !== 'MENUNGGU')
        .sort((a, b) => {
          const dA = a.entryDate || a.confirmDate || a.exitDate || '';
          const dB = b.entryDate || b.confirmDate || b.entryDate || '';
          if (dA !== dB) return dA.localeCompare(dB);
          return (a.id || '').localeCompare(b.id || '');
        });

      // Deteksi lokasi awal aset & tanggal masuk awal
      let initialLocation = asset.locationCode;
      let initialDateStr = asset.entryDate || asset.buyDate || '';
      const baruRot = validRots.find((r) => r.type === 'BARU' || r.fromLocationCode?.toUpperCase() === 'BARU');
      if (baruRot) {
        initialLocation = baruRot.toLocationCode;
        initialDateStr = baruRot.entryDate || baruRot.confirmDate || baruRot.exitDate || initialDateStr;
      } else if (validRots.length > 0) {
        const first = validRots[0];
        if (first.fromLocationCode && first.fromLocationCode.toUpperCase() !== 'BARU') {
          initialLocation = first.fromLocationCode;
        } else {
          initialLocation = first.toLocationCode;
        }
        if (!initialDateStr && (first.entryDate || first.exitDate)) {
          initialDateStr = first.entryDate || first.exitDate || '';
        }
      }

      if (periodEndNum === null) {
        if (asset.status === 'DELETED') return null;
        let latestLoc = asset.locationCode;
        let latestEntry = asset.entryDate;
        if (validRots.length > 0) {
          const last = validRots[validRots.length - 1];
          latestLoc = last.toLocationCode;
          latestEntry = last.entryDate || last.confirmDate || last.exitDate || asset.entryDate;
          if (latestLoc.toUpperCase() === 'DIHAPUS') return null;
        }
        return {
          ...asset,
          lokasi_aktif: latestLoc,
          tanggal_aktif: latestEntry,
        };
      }

      // 2. Ambil riwayat dengan tanggal_pindah <= END_DATE
      const eligible = validRots.filter((r) => {
        const dStr = r.entryDate || r.confirmDate || r.exitDate;
        if (!dStr) return false;
        const m = dStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        const num = m ? parseInt(m[1], 10) * 10000 + parseInt(m[2], 10) * 100 + parseInt(m[3], 10) : null;
        return num !== null && num <= periodEndNum!;
      });

      // 3. Jika TIDAK ADA riwayat <= END_DATE -> Cek mode kumulatif & fallback lokasi awal
      if (eligible.length === 0) {
        const m = initialDateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        const entryNum = m ? parseInt(m[1], 10) * 10000 + parseInt(m[2], 10) * 100 + parseInt(m[3], 10) : null;
        if (!entryNum || entryNum > periodEndNum) {
          // Aset belum lahir / masuk di periode ini -> JANGAN TAMPILKAN
          return null;
        }

        if (asset.status === 'DELETED' && asset.deleteDate) {
          const dm = asset.deleteDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
          const delNum = dm ? parseInt(dm[1], 10) * 10000 + parseInt(dm[2], 10) * 100 + parseInt(dm[3], 10) : null;
          if (delNum !== null && delNum <= periodEndNum) return null;
        }

        return {
          ...asset,
          lokasi_aktif: initialLocation,
          tanggal_aktif: initialDateStr || asset.entryDate,
        };
      }

      // 4. Ambil 1 riwayat TERAKHIR
      const latest = eligible[eligible.length - 1];
      const activeLoc = latest.toLocationCode;
      if (activeLoc.toUpperCase() === 'DIHAPUS') return null;

      if (asset.status === 'DELETED' && asset.deleteDate) {
        const dm = asset.deleteDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        const delNum = dm ? parseInt(dm[1], 10) * 10000 + parseInt(dm[2], 10) * 100 + parseInt(dm[3], 10) : null;
        if (delNum !== null && delNum <= periodEndNum) return null;
      }

      return {
        ...asset,
        lokasi_aktif: activeLoc,
        tanggal_aktif: latest.entryDate || latest.confirmDate || latest.exitDate || initialDateStr || asset.entryDate,
      };
    }).filter((a): a is NonNullable<typeof a> => a !== null);

    // 5. Filter lokasi & hak akses lokasi user
    if (filterLokasi !== 'ALL') {
      results = results.filter((a) => a.lokasi_aktif === filterLokasi);
    }
    if (userAllowedLocations !== null) {
      results = results.filter((a) => userAllowedLocations.includes(a.lokasi_aktif));
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (a) =>
          a.code.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.lokasi_aktif.toLowerCase().includes(q)
      );
    }

    return results.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }

  // GET /api/menu1/assets
  app.get('/api/menu1/assets', (req, res) => {
    try {
      const bulan = req.query.bulan ? parseInt(req.query.bulan as string, 10) : 'ALL';
      const tahun = req.query.tahun ? parseInt(req.query.tahun as string, 10) : 'ALL';
      const riwayatLokasiOn = req.query.riwayat_lokasi === 'ON' || req.query.riwayat_lokasi === '1';
      const filterLokasi = (req.query.lokasi as string) || 'ALL';
      const search = req.query.search as string | undefined;
      const usernameParam = (req.query.user || req.headers['x-user-id']) as string | undefined;

      const allowedLocs = getLokasiAksesUser(usernameParam);

      const data = v_aset_lokasi_per_periode(
        bulan,
        tahun,
        riwayatLokasiOn,
        filterLokasi,
        allowedLocs,
        search
      );

      return res.json({
        total: data.length,
        periode: { bulan, tahun, riwayatLokasiOn },
        data,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Gagal memuat data Menu 1' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';
  let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    PORT = parseInt(process.argv[portArgIndex + 1], 10);
  }

  let HOST = '0.0.0.0';
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    HOST = process.argv[hostArgIndex + 1];
  }

  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
