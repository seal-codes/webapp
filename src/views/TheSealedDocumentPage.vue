<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDocumentStore } from "../stores/documentStore";
import BaseButton from "../components/common/BaseButton.vue";
import FormatConversionNotification from "../components/sealed/FormatConversionNotification.vue";

const route = useRoute();
const router = useRouter();
const documentStore = useDocumentStore();

const documentId = computed(() => route.params.documentId as string);
const isLoading = ref(true);

onMounted(async () => {
  try {
    if (
      !documentStore.hasDocument ||
      documentStore.documentId !== documentId.value
    ) {
      router.push("/document");
      return;
    }

    isLoading.value = false;
  } catch (error) {
    console.error("Error loading sealed document:", error);
    isLoading.value = false;
  }
});

const downloadDocument = () => {
  documentStore.downloadSealedDocument();
};

const goBack = () => {
  router.push("/document");
};

const sealInfo = [
  "A unique document identifier",
  "Timestamp of sealing",
  "Your authentication information (hashed for privacy)",
  "A verification URL that can be accessed by scanning the QR code with any QR code reader",
];
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-bold">Your Sealed Document</h1>
        <p class="text-gray-600">Your document has been successfully sealed</p>
      </div>

      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div
          class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"
        />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Main Column -->
        <div class="md:col-span-2">
          <div class="card mb-8 animate-fade-in">
            <h2 class="text-2xl font-bold mb-4">Sealed Document</h2>

            <div class="mb-6">
              <div
                class="bg-gray-100 p-4 rounded-lg flex items-center justify-center"
              >
                <img
                  v-if="documentStore.sealedDocumentUrl"
                  :src="documentStore.sealedDocumentUrl"
                  alt="Sealed Document"
                  class="max-w-full max-h-[500px] rounded shadow-sm"
                />
              </div>
            </div>

            <div class="flex justify-between items-center">
              <BaseButton variant="secondary" @click="goBack">
                ← Back
              </BaseButton>

              <BaseButton variant="primary" @click="downloadDocument">
                Download Document
              </BaseButton>
            </div>
          </div>

          <!-- Format Conversion Notification (spans full width) -->
          <div
            v-if="documentStore.formatConversionResult?.wasConverted"
            class="md:col-span-3"
          >
            <FormatConversionNotification
              :conversion-result="documentStore.formatConversionResult"
              @acknowledge="documentStore.acknowledgeFormatConversion"
            />
          </div>
        </div>

        <!-- Sidebar -->
        <div class="md:col-span-1">
          <div class="bg-white rounded-xl shadow-sm p-6">
            <h2 class="text-xl font-bold mb-6">What's in Your Seal?</h2>

            <div class="space-y-4">
              <div
                v-for="(info, index) in sealInfo"
                :key="index"
                class="flex items-start gap-3"
              >
                <div class="numbered-circle">
                  {{ index + 1 }}
                </div>
                <p class="text-gray-700">
                  {{ info }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
