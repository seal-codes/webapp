/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Debug tool to trace verification issues step by step
 */

import { documentHashService } from './document-hash-service'
import { attestationBuilder } from './attestation-builder'

/**
 * Debug verification process step by step
 */
export async function debugVerification(document: File, attestationData: any) {
  console.log('🔍 DEBUG: Starting verification debug...')
  console.log('📄 Document:', document.name, document.type, document.size, 'bytes')
  console.log('📋 Attestation data:', attestationData)
  
  try {
    // Step 1: Extract exclusion zone
    console.log('--- STEP 1: Extract Exclusion Zone ---')
    const exclusionZone = attestationBuilder.extractExclusionZone(attestationData)
    console.log('🎯 Extracted exclusion zone:', exclusionZone)
    
    // Step 2: Calculate hashes
    console.log('--- STEP 2: Calculate Document Hashes ---')
    console.log('⏳ Calling documentHashService.calculateDocumentHashes...')
    
    const startTime = Date.now()
    const calculatedHashes = await documentHashService.calculateDocumentHashes(
      document,
      exclusionZone,
    )
    const endTime = Date.now()
    
    console.log('✅ Hash calculation completed in', endTime - startTime, 'ms')
    console.log('🔐 Calculated hashes:', {
      cryptographic: calculatedHashes.cryptographic,
      pHashLength: calculatedHashes.pHash.length,
      dHashLength: calculatedHashes.dHash.length,
      pHashPrefix: calculatedHashes.pHash.substring(0, 20),
      dHashFull: calculatedHashes.dHash,
    })
    
    // Step 3: Compare with stored hashes
    console.log('--- STEP 3: Compare Hashes ---')
    const storedHashes = {
      cryptographic: attestationData.h.c,
      pHash: attestationData.h.p.p,
      dHash: attestationData.h.p.d,
    }
    
    console.log('📊 Stored hashes:', {
      cryptographic: storedHashes.cryptographic,
      pHashLength: storedHashes.pHash.length,
      dHashLength: storedHashes.dHash.length,
      pHashPrefix: storedHashes.pHash.substring(0, 20),
      dHashFull: storedHashes.dHash,
    })
    
    // Step 4: Detailed comparison
    console.log('--- STEP 4: Detailed Comparison ---')
    const cryptographicMatch = calculatedHashes.cryptographic === storedHashes.cryptographic
    const pHashMatch = calculatedHashes.pHash === storedHashes.pHash
    const dHashMatch = calculatedHashes.dHash === storedHashes.dHash
    
    console.log('🔍 Comparison results:')
    console.log('- Cryptographic match:', cryptographicMatch ? '✅' : '❌')
    console.log('- pHash match:', pHashMatch ? '✅' : '❌')
    console.log('- dHash match:', dHashMatch ? '✅' : '❌')
    
    if (!cryptographicMatch) {
      console.log('❌ CRYPTOGRAPHIC HASH MISMATCH:')
      console.log('  Calculated:', calculatedHashes.cryptographic)
      console.log('  Stored:    ', storedHashes.cryptographic)
      console.log('  This indicates exclusion zone application is inconsistent')
    }
    
    if (!pHashMatch) {
      console.log('❌ PERCEPTUAL HASH (pHash) MISMATCH:')
      console.log('  Calculated:', calculatedHashes.pHash)
      console.log('  Stored:    ', storedHashes.pHash)
      
      // Find first difference
      for (let i = 0; i < Math.min(calculatedHashes.pHash.length, storedHashes.pHash.length); i++) {
        if (calculatedHashes.pHash[i] !== storedHashes.pHash[i]) {
          console.log(`  First difference at position ${i}: calculated='${calculatedHashes.pHash[i]}' vs stored='${storedHashes.pHash[i]}'`)
          break
        }
      }
    }
    
    if (!dHashMatch) {
      console.log('❌ DIFFERENCE HASH (dHash) MISMATCH:')
      console.log('  Calculated:', calculatedHashes.dHash)
      console.log('  Stored:    ', storedHashes.dHash)
    }
    
    // Step 5: Summary
    console.log('--- STEP 5: Debug Summary ---')
    if (cryptographicMatch && pHashMatch && dHashMatch) {
      console.log('🎉 SUCCESS: All hashes match - verification should work!')
    } else if (!cryptographicMatch) {
      console.log('🚨 CRITICAL: Cryptographic hash mismatch indicates exclusion zone issue')
      console.log('   - Check if exclusion zone coordinates are correct')
      console.log('   - Check if fill color is applied correctly')
      console.log('   - Check if image dimensions match between seal/verify')
    } else {
      console.log('⚠️  PARTIAL: Cryptographic hash matches but perceptual hashes differ')
      console.log('   - This suggests perceptual hash algorithm inconsistency')
      console.log('   - Image content is preserved but perceptual analysis differs')
    }
    
    return {
      success: true,
      calculatedHashes,
      storedHashes,
      matches: {
        cryptographic: cryptographicMatch,
        pHash: pHashMatch,
        dHash: dHashMatch,
      },
    }
    
  } catch (error) {
    console.error('❌ DEBUG: Error during verification:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Stack trace:', errorStack)
    return {
      success: false,
      error: errorMessage,
      stack: errorStack,
    }
  }
}

// Export for browser console use
if (typeof window !== 'undefined') {
  (window as any).debugVerification = debugVerification
}
