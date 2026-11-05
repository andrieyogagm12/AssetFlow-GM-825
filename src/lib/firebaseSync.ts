import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, firebaseConfig } from './firebase';
import { DatabaseBackupSnapshot, Asset, LocationItem, RotationRecord, PeriodLock } from '../types/asset';

export interface FirebaseSyncStatus {
  connected: boolean;
  projectId: string;
  databaseId: string;
  lastSyncAt: string | null;
}

/**
 * Save complete application snapshot to Firestore 'backups' and sync core collections
 */
export async function syncSnapshotToFirestore(snapshot: DatabaseBackupSnapshot): Promise<boolean> {
  const backupDocId = `snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const path = `backups/${backupDocId}`;

  try {
    // 1. Save complete backup document
    await setDoc(doc(db, 'backups', backupDocId), {
      ...snapshot,
      cloudSyncedAt: serverTimestamp(),
      projectId: firebaseConfig.projectId,
    });

    // 2. Update pointer to latest snapshot
    await setDoc(doc(db, 'system', 'latest_backup'), {
      backupId: backupDocId,
      timestamp: snapshot.timestamp,
      totalAssets: snapshot.data.assets.length,
      totalLocations: snapshot.data.locations.length,
      totalRotations: snapshot.data.rotations.length,
      syncedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch latest snapshot from Firestore
 */
export async function fetchLatestSnapshotFromFirestore(): Promise<DatabaseBackupSnapshot | null> {
  const path = 'system/latest_backup';
  try {
    const pointerSnap = await getDoc(doc(db, 'system', 'latest_backup'));
    if (!pointerSnap.exists()) {
      return null;
    }
    const { backupId } = pointerSnap.data() as { backupId: string };
    if (!backupId) return null;

    const backupDocSnap = await getDoc(doc(db, 'backups', backupId));
    if (!backupDocSnap.exists()) return null;

    return backupDocSnap.data() as DatabaseBackupSnapshot;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Sync individual asset to Firestore
 */
export async function syncAssetToFirestore(asset: Asset): Promise<void> {
  const path = `assets/${asset.code}`;
  try {
    await setDoc(
      doc(db, 'assets', asset.code),
      {
        ...asset,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sync audit log to Firestore
 */
export async function logAuditToFirestore(auditData: {
  username?: string;
  assetCode?: string;
  actualLocation?: string;
  action: string;
}): Promise<void> {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `auditLogs/${logId}`;
  try {
    await setDoc(doc(db, 'auditLogs', logId), {
      ...auditData,
      id: logId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
