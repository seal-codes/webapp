<template>
  <div>
    <p class="mb-4">
      Congratulations! Your document has been sealed with a unique QR code.
    </p>
    
    <h4 class="text-lg font-medium mb-2">What's in Your Seal?</h4>
    <p class="mb-4">
      Your digital seal contains:
    </p>
    
    <ul class="list-disc pl-5 mb-4 space-y-2">
      <li>A unique document identifier</li>
      <li>Timestamp of sealing</li>
      <li>Your authentication information (hashed for privacy)</li>
      <li>A verification URL</li>
    </ul>
    
    <h4 class="text-lg font-medium mb-2">Sharing Your Document</h4>
    <p class="mb-4">
      When you share your sealed document, recipients can scan the QR code to verify:
    </p>
    
    <ul class="list-disc pl-5 mb-4 space-y-2">
      <li>When the document was sealed</li>
      <li>That it hasn't been tampered with since sealing</li>
      <li>The digital identity associated with the seal</li>
    </ul>
    
    <div class="bg-green-50 border-l-4 border-green-500 p-4 mt-6">
      <p class="text-sm text-green-700">
        <strong>Tip:</strong> Download your sealed document using the button below the preview. The seal remains valid regardless of how the document is shared.
      </p>
    </div>
  </div>
</template>