// Simplified QR Code Size Analysis - focuses on data structure analysis
// Usage: npm run analyze:qr [file1] [file2] ...

import { attestationBuilder } from '@/services/attestation-builder'
import { verificationService } from '@/services/verification-service'
import { qrCodeUICalculator } from '@/services/qrcode-ui-calculator'
import type { QRCodeUIPosition, DocumentHashes } from '@/types/qrcode'
import fs from 'fs'
import path from 'path'

interface QRCapacity {
  version: number
  capacity: number
  modules: number
}

// QR Code capacity data (alphanumeric mode, error correction level M)
const QR_CAPACITIES: QRCapacity[] = [
  { version: 5, capacity: 108, modules: 25 },
  { version: 10, capacity: 271, modules: 57 },
  { version: 15, capacity: 535, modules: 77 },
  { version: 20, capacity: 891, modules: 97 },
  { version: 25, capacity: 1335, modules: 117 },
  { version: 30, capacity: 1867, modules: 137 },
  { version: 35, capacity: 2473, modules: 157 },
  { version: 40, capacity: 3159, modules: 177 },
]

function analyzeQRComplexity(filePath: string) {
  const fileName = path.basename(filePath)
  console.log(`\n=== Analyzing ${fileName} ===`)
  
  try {
    // Read file for size estimation
    const fileBuffer = fs.readFileSync(filePath)
    const fileExtension = path.extname(filePath).toLowerCase()
    
    console.log(`File size: ${(fileBuffer.length / 1024).toFixed(1)} KB`)

    // Estimate dimensions based on file size
    const estimatedDimensions = estimateImageDimensions(fileBuffer.length, fileExtension)
    console.log(`Estimated dimensions: ${estimatedDimensions.width}x${estimatedDimensions.height}`)

    // Calculate QR positioning
    const qrPosition: QRCodeUIPosition = { x: 85, y: 85 }
    const qrSizePercent = 15

    const pixelCalculation = qrCodeUICalculator.calculateEmbeddingPixels(
      qrPosition,
      qrSizePercent,
      estimatedDimensions,
      'image',
    )

    console.log(`QR seal dimensions: ${pixelCalculation.completeSealDimensions.width}x${pixelCalculation.completeSealDimensions.height}`)

    // Create realistic mock hashes (typical sizes)
    const mockHashes: DocumentHashes = {
      cryptographic: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890', // 64 chars (SHA-256)
      pHash: '1100110011001100110011001100110011001100110011001100110011001100', // 64 chars (typical pHash)
      dHash: '110011001100110011001100110011001100', // 36 chars (typical dHash)
    }

    console.log('\nHash Analysis:')
    console.log(`- Cryptographic (SHA-256): ${mockHashes.cryptographic.length} chars`)
    console.log(`- Perceptual (pHash): ${mockHashes.pHash.length} chars`)
    console.log(`- Difference (dHash): ${mockHashes.dHash.length} chars`)

    // Build realistic attestation data
    const attestationData = attestationBuilder.buildCompactAttestation({
      documentHashes: mockHashes,
      identity: {
        provider: 'github',
        identifier: 'photographer@example.com',
      },
      serviceInfo: {
        publicKeyId: 'seal-2024-prod-key',
      },
      exclusionZone: pixelCalculation.exclusionZone,
      userUrl: 'https://instagram.com/photographer',
    })

    // Analyze data sizes
    console.log('\nData Size Analysis:')
    const attestationJson = JSON.stringify(attestationData)
    console.log(`- Full JSON: ${attestationJson.length} bytes`)
    
    // Show data breakdown
    console.log('\nData Components (JSON):')
    console.log(`- Hashes: ${JSON.stringify(attestationData.h).length} bytes`)
    console.log(`- Identity: ${JSON.stringify(attestationData.i).length} bytes`)
    console.log(`- Service: ${JSON.stringify(attestationData.s).length} bytes`)
    console.log(`- Exclusion Zone: ${JSON.stringify(attestationData.e).length} bytes`)
    console.log(`- Timestamp: ${attestationData.t.length} bytes`)
    if (attestationData.u) {
      console.log(`- User URL: ${attestationData.u.length} bytes`)
    }

    // Test compact encoding
    const compactData = verificationService.encodeForQR(attestationData)
    console.log(`\nCompact Encoding: ${compactData.length} bytes`)
    
    // Calculate compression ratio
    const compressionRatio = ((attestationJson.length - compactData.length) / attestationJson.length * 100).toFixed(1)
    console.log(`Compression ratio: ${compressionRatio}%`)

    // Analyze compact bundle components
    console.log('\nCompact Bundle Analysis:')
    const compactStats = verificationService.getEncodingStats(attestationData)
    console.log(`- Original JSON: ${compactStats.originalSize} bytes`)
    console.log(`- Compact JSON: ${compactStats.compactSize} bytes`)
    console.log(`- CBOR encoded: ${compactStats.cborSize} bytes`)
    console.log(`- Final encoded: ${compactStats.finalSize} bytes`)
    
    // Show individual component sizes in compact form
    const decodedCompact = verificationService.decodeFromQR(compactData)
    if (decodedCompact.isValid) {
      console.log('\nCompact Component Breakdown:')

      // Test each component
      const componentSizes = {
        'Hashes': JSON.stringify(attestationData.h).length,
        'Identity': JSON.stringify(attestationData.i).length,
        'Service': JSON.stringify(attestationData.s).length,
        'Timestamp': JSON.stringify(attestationData.t).length,
        'Exclusion Zone': JSON.stringify(attestationData.e).length,
        'User URL': attestationData.u ? JSON.stringify(attestationData.u).length : 0,
      }
      
      for (const [name, size] of Object.entries(componentSizes)) {
        if (size > 0) {
          const percentage = ((size / attestationJson.length) * 100).toFixed(1)
          console.log(`- ${name.padEnd(13)}: ${size.toString().padStart(3)} bytes (${percentage.padStart(4)}% of total)`)
        }
      }
    }

    // QR Code version analysis
    console.log('\nQR Code Version Analysis:')
    let minVersion: QRCapacity | undefined
    let recommendedVersion: QRCapacity | undefined
    
    for (const qr of QR_CAPACITIES) {
      const fits = compactData.length <= qr.capacity
      const percentage = ((compactData.length / qr.capacity) * 100).toFixed(1)
      const utilizationLevel = parseFloat(percentage)
      
      let status = fits ? '✓' : '✗'
      let note = ''
      
      if (fits) {
        if (utilizationLevel > 90) {
          status = '⚠️'
          note = ' (very tight fit)'
        } else if (utilizationLevel > 75) {
          status = '⚡'
          note = ' (tight fit)'
        } else if (utilizationLevel > 50) {
          status = '✅'
          note = ' (good fit)'
        } else {
          status = '💚'
          note = ' (plenty of room)'
        }
      }
      
      console.log(`- Version ${qr.version.toString().padStart(2)} (${qr.modules}x${qr.modules}, ${qr.capacity.toString().padStart(4)} bytes): ${status} ${percentage.padStart(5)}% full${note}`)
      
      if (fits && !minVersion) {
        minVersion = qr
      }
      
      if (fits && utilizationLevel <= 75 && !recommendedVersion) {
        recommendedVersion = qr
      }
    }

    if (minVersion) {
      console.log(`\n🎯 Required QR Version: ${minVersion.version} (${minVersion.modules}x${minVersion.modules} modules)`)
      
      if (recommendedVersion && recommendedVersion.version !== minVersion.version) {
        console.log(`📋 Recommended QR Version: ${recommendedVersion.version} (${recommendedVersion.modules}x${recommendedVersion.modules} modules) - allows for growth`)
      }
      
      // Physical sizes
      console.log('\nPhysical QR Code Sizes (minimum version):')
      const sizes = [
        { dpi: 300, name: 'print quality' },
        { dpi: 150, name: 'draft print' },
        { dpi: 72, name: 'screen display' },
      ]
      
      sizes.forEach(({ dpi, name }) => {
        const moduleSize = 25.4 / dpi
        const physicalSize = (minVersion.modules * moduleSize).toFixed(1)
        console.log(`- At ${dpi} DPI (${name}): ${physicalSize}mm x ${physicalSize}mm`)
      })
      
      // Scanability assessment
      console.log('\nScanability Assessment:')
      if (minVersion.version <= 10) {
        console.log('📱 Excellent - Easy to scan with any device')
      } else if (minVersion.version <= 20) {
        console.log('📱 Good - Scannable with most modern devices')
      } else if (minVersion.version <= 30) {
        console.log('📱 Fair - May require good camera/lighting')
      } else {
        console.log('📱 Poor - Difficult to scan reliably')
      }
    } else {
      console.log('\n❌ Data too large for QR Code Version 40!')
    }

    return {
      fileName,
      fileSize: fileBuffer.length,
      compactSize: compactData.length,
      minQrVersion: minVersion?.version || null,
      recommendedQrVersion: recommendedVersion?.version || null,
      qrUtilization: minVersion ? parseFloat(((compactData.length / minVersion.capacity) * 100).toFixed(1)) : null,
      compressionRatio: parseFloat(compressionRatio),
    }

  } catch (error) {
    console.error(`Error analyzing ${fileName}:`, error)
    return null
  }
}

function estimateImageDimensions(fileSize: number, extension: string) {
  if (extension === '.png') {
    const pixels = fileSize / 3
    const side = Math.sqrt(pixels)
    return { width: Math.round(side), height: Math.round(side) }
  } else {
    const pixels = fileSize / 0.5
    const side = Math.sqrt(pixels)
    return { width: Math.round(side), height: Math.round(side) }
  }
}

function printUsage() {
  console.log('🔍 QR Code Size Analysis Tool (Simplified)')
  console.log('===========================================')
  console.log('')
  console.log('Usage:')
  console.log('  npm run analyze:qr-simple [file1] [file2] ...')
  console.log('')
  console.log('Examples:')
  console.log('  npm run analyze:qr-simple ./media/logo.png')
  console.log('  npm run analyze:qr-simple ./media/logo.png ./photos/vacation.jpg')
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    printUsage()
    return
  }

  console.log('🔍 QR Code Attestation Size Analysis (Simplified)')
  console.log('==================================================')

  let testFiles: string[]

  if (args.length > 0) {
    testFiles = args
    console.log(`\nAnalyzing ${testFiles.length} file(s) from command line...`)
  } else {
    testFiles = ['./media/logo.png']
    console.log('\nNo files specified, using default logo file...')
  }

  const results = []

  for (const filePath of testFiles) {
    if (fs.existsSync(filePath)) {
      const result = analyzeQRComplexity(filePath)
      if (result) {
        results.push(result)
      }
    } else {
      console.log(`\n⚠️  File not found: ${filePath}`)
    }
  }

  // Summary
  if (results.length > 0) {
    console.log('\n📊 SUMMARY')
    console.log('===========')
    
    results.forEach(result => {
      console.log(`\n${result.fileName}:`)
      console.log(`  File size: ${(result.fileSize / 1024).toFixed(1)} KB`)
      console.log(`  QR data: ${result.compactSize} bytes`)
      console.log(`  Compression: ${result.compressionRatio}%`)
      console.log(`  Required QR version: ${result.minQrVersion || 'Too large'}`)
      if (result.recommendedQrVersion && result.recommendedQrVersion !== result.minQrVersion) {
        console.log(`  Recommended QR version: ${result.recommendedQrVersion}`)
      }
      if (result.qrUtilization) {
        console.log(`  QR utilization: ${result.qrUtilization}%`)
      }
    })

    if (results.length > 1) {
      const avgSize = results.reduce((sum, r) => sum + r.compactSize, 0) / results.length
      const maxVersion = Math.max(...results.filter(r => r.minQrVersion).map(r => r.minQrVersion!))
      
      console.log('\nOverall Statistics:')
      console.log(`- Average QR data size: ${avgSize.toFixed(0)} bytes`)
      console.log(`- Largest QR version needed: ${maxVersion}`)
    }
  }
}

main().catch(console.error)
