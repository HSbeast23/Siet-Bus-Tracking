/**
 * ONE-TIME CLEANUP SCRIPT
 * Removes the fake "SIET--005" (double hyphen) document from Firestore
 * 
 * Usage: Call this function once from any screen or run manually
 * After running, the only document will be "SIET-005" (single hyphen)
 */

import { db } from '../services/firebaseConfig';
import { doc, deleteDoc, getDoc } from 'firebase/firestore';

/**
 * Deletes the fake bus document with double hyphen
 * @param {string} fakeBusNumber - The fake bus number to delete (e.g., "SIET--005")
 * @returns {Promise<boolean>} - true if deleted successfully
 */
export const deleteFakeBusDocument = async (fakeBusNumber = "SIET--005") => {
  try {
    console.log(`🗑️ [CLEANUP] Attempting to delete fake document: ${fakeBusNumber}`);
    
    // Reference to the fake document
    const fakeDocRef = doc(db, 'buses', fakeBusNumber);
    
    // Check if document exists
    const docSnap = await getDoc(fakeDocRef);
    
    if (!docSnap.exists()) {
      console.log(`ℹ️ [CLEANUP] Document ${fakeBusNumber} does not exist. Already cleaned up.`);
      return true;
    }
    
    console.log(`📄 [CLEANUP] Found fake document:`, docSnap.data());
    
    // Delete the fake document
    await deleteDoc(fakeDocRef);
    
    console.log(`✅ [CLEANUP] Successfully deleted fake document: ${fakeBusNumber}`);
    console.log(`✅ [CLEANUP] Only the real "SIET-005" document remains.`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ [CLEANUP] Error deleting fake document:`, error);
    return false;
  }
};

/**
 * Also cleanup fake document from busLocations collection if it exists
 */
export const deleteFakeBusLocationDocument = async (fakeBusNumber = "SIET--005") => {
  try {
    console.log(`🗑️ [CLEANUP] Checking busLocations for fake document: ${fakeBusNumber}`);
    
    const fakeLocationRef = doc(db, 'busLocations', fakeBusNumber);
    const locationSnap = await getDoc(fakeLocationRef);
    
    if (!locationSnap.exists()) {
      console.log(`ℹ️ [CLEANUP] No fake location document found. Good!`);
      return true;
    }
    
    console.log(`📄 [CLEANUP] Found fake location document:`, locationSnap.data());
    await deleteDoc(fakeLocationRef);
    
    console.log(`✅ [CLEANUP] Deleted fake location document: ${fakeBusNumber}`);
    return true;
    
  } catch (error) {
    console.error(`❌ [CLEANUP] Error deleting fake location:`, error);
    return false;
  }
};

/**
 * Complete cleanup - removes fake documents from both collections
 */
export const cleanupAllFakeDocuments = async () => {
  console.log('🧹 [CLEANUP] Starting complete cleanup...');
  
  const busResult = await deleteFakeBusDocument("SIET--005");
  const locationResult = await deleteFakeBusLocationDocument("SIET--005");
  
  if (busResult && locationResult) {
    console.log('✅ [CLEANUP] Complete! All fake documents removed.');
    console.log('✅ [CLEANUP] Only normalized "SIET-005" documents remain.');
    return true;
  }
  
  return false;
};
