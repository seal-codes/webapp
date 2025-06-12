<template>
  <ExpandableDetails
    ref="expandableDetailsRef"
    v-if="conversionResult?.wasConverted"
    :title="title"
    :subtitle="subtitle"
    :icon="RotateCcw"
    icon-color="text-blue-500"
    bg-color="bg-blue-50"
    border-color="border-blue-200"
  >
    <!-- Format Change Display -->
    <div class="mb-6">
      <h4 class="font-semibold text-gray-900 mb-3">
        {{ t("formatConversion.sections.formatChange.title") }}
      </h4>
      <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <span class="format-badge original">{{
          getFormatDisplayName(conversionResult.originalFormat)
        }}</span>
        <ArrowRight class="w-5 h-5 text-gray-400" />
        <span class="format-badge converted">{{
          getFormatDisplayName(conversionResult.finalFormat)
        }}</span>
      </div>
    </div>

    <!-- User Message -->
    <div class="mb-6">
      <div class="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
        <div class="flex items-start gap-3">
          <AlertTriangle class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div class="text-sm text-gray-700 whitespace-pre-line">
            {{ userMessage }}
          </div>
        </div>
      </div>
    </div>

    <!-- Size Comparison -->
    <div v-if="conversionResult.sizeComparison" class="mb-6">
      <h4 class="font-semibold text-gray-900 mb-3">
        {{ t("formatConversion.sections.sizeImpact.title") }}
      </h4>
      <div class="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div class="text-center">
          <div class="text-sm text-gray-600">
            {{ t("formatConversion.sections.sizeImpact.original") }}
          </div>
          <div class="font-semibold">
            {{ formatFileSize(conversionResult.sizeComparison.originalSize) }}
          </div>
        </div>
        <div class="text-center">
          <div class="text-sm text-gray-600">
            {{ t("formatConversion.sections.sizeImpact.sealed") }}
          </div>
          <div class="font-semibold">
            {{ formatFileSize(conversionResult.sizeComparison.finalSize) }}
          </div>
        </div>
        <div class="text-center">
          <div class="text-sm text-gray-600">
            {{ t("formatConversion.sections.sizeImpact.change") }}
          </div>
          <div :class="sizeChangeClass" class="font-semibold">
            {{ sizeChangeText }}
          </div>
        </div>
      </div>
    </div>

    <!-- Benefits -->
    <div class="mb-6">
      <h4 class="font-semibold text-gray-900 mb-3">
        {{ t("formatConversion.sections.benefits.title") }}
      </h4>
      <div class="space-y-3">
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <CheckCircle class="w-5 h-5 text-green-500 flex-shrink-0" />
          <span class="text-sm text-gray-900">{{
            t("formatConversion.sections.benefits.exactVerification")
          }}</span>
        </div>
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <Shield class="w-5 h-5 text-green-500 flex-shrink-0" />
          <span class="text-sm text-gray-900">{{
            t("formatConversion.sections.benefits.pixelPerfect")
          }}</span>
        </div>
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <FileCheck class="w-5 h-5 text-green-500 flex-shrink-0" />
          <span class="text-sm text-gray-900">{{
            t("formatConversion.sections.benefits.cryptographicHash")
          }}</span>
        </div>
      </div>
    </div>

    <!-- Technical Details -->
    <div class="mb-6">
      <h4 class="font-semibold text-gray-900 mb-3">
        {{ t("formatConversion.sections.technicalDetails.title") }}
      </h4>
      <div class="space-y-2">
        <div class="flex justify-between py-2 px-3 bg-gray-50 rounded-lg">
          <span class="text-sm font-medium text-gray-700"
            >{{
              t("formatConversion.sections.technicalDetails.originalFormat")
            }}:</span
          >
          <span class="text-sm text-gray-900 font-mono">{{
            conversionResult.originalFormat
          }}</span>
        </div>
        <div class="flex justify-between py-2 px-3 bg-gray-50 rounded-lg">
          <span class="text-sm font-medium text-gray-700"
            >{{
              t("formatConversion.sections.technicalDetails.finalFormat")
            }}:</span
          >
          <span class="text-sm text-gray-900 font-mono">{{
            conversionResult.finalFormat
          }}</span>
        </div>
        <div class="flex justify-between py-2 px-3 bg-gray-50 rounded-lg">
          <span class="text-sm font-medium text-gray-700"
            >{{
              t("formatConversion.sections.technicalDetails.conversionMethod")
            }}:</span
          >
          <span class="text-sm text-gray-900">{{
            t(
              "formatConversion.sections.technicalDetails.conversionMethodValue"
            )
          }}</span>
        </div>
        <div class="flex justify-between py-2 px-3 bg-gray-50 rounded-lg">
          <span class="text-sm font-medium text-gray-700"
            >{{
              t("formatConversion.sections.technicalDetails.quality")
            }}:</span
          >
          <span class="text-sm text-gray-900">{{
            t("formatConversion.sections.technicalDetails.qualityValue")
          }}</span>
        </div>
        <div class="flex justify-between py-2 px-3 bg-gray-50 rounded-lg">
          <span class="text-sm font-medium text-gray-700"
            >{{
              t("formatConversion.sections.technicalDetails.verificationType")
            }}:</span
          >
          <span class="text-sm text-gray-900">{{
            t(
              "formatConversion.sections.technicalDetails.verificationTypeValue"
            )
          }}</span>
        </div>
      </div>
    </div>

    <!-- Action Button -->
    <div class="flex justify-end">
      <button
        @click="handleAcknowledge"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        {{ t("formatConversion.acknowledge") }}
      </button>
    </div>
  </ExpandableDetails>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  RotateCcw,
  ArrowRight,
  CheckCircle,
  Shield,
  FileCheck,
  AlertTriangle,
} from "lucide-vue-next";
import ExpandableDetails from "@/components/common/ExpandableDetails.vue";
import type { FormatConversionResult } from "@/services/format-conversion-service";

interface Props {
  conversionResult: FormatConversionResult | null;
}

const props = defineProps<Props>();
const { t } = useI18n();

// Template ref for the ExpandableDetails component
const expandableDetailsRef = ref<InstanceType<typeof ExpandableDetails> | null>(null);

// Handle acknowledge action - collapse the section and emit event
const handleAcknowledge = () => {
  // Collapse the expandable section
  if (expandableDetailsRef.value) {
    expandableDetailsRef.value.collapse();
  }
  // Still emit the acknowledge event for parent components
  emit('acknowledge');
};

// Define emits
const emit = defineEmits<{
  acknowledge: []
}>();

const title = computed(() => {
  if (!props.conversionResult) return "";
  const originalName = getFormatDisplayName(
    props.conversionResult.originalFormat
  );
  const finalName = getFormatDisplayName(props.conversionResult.finalFormat);
  return t("formatConversion.title", {
    originalFormat: originalName,
    finalFormat: finalName,
  });
});

const subtitle = computed(() => {
  return t("formatConversion.subtitle");
});

const sizeChangeClass = computed(() => {
  if (!props.conversionResult?.sizeComparison) return "";
  const change = props.conversionResult.sizeComparison.percentageChange;
  return change > 0 ? "text-orange-600" : "text-green-600";
});

const sizeChangeText = computed(() => {
  if (!props.conversionResult?.sizeComparison) return "";
  const change = props.conversionResult.sizeComparison.percentageChange;
  const absChange = Math.abs(change);
  return change > 0 ? `+${absChange}%` : `-${absChange}%`;
});

const userMessage = computed(() => {
  if (!props.conversionResult) return "";

  const { originalFormat, finalFormat, sizeComparison } =
    props.conversionResult;

  const originalName = getFormatDisplayName(originalFormat);
  const targetName = getFormatDisplayName(finalFormat);

  const sizeChange = sizeComparison?.percentageChange || 0;
  const sizeDescription =
    sizeChange > 0
      ? t("common.larger", { percent: sizeChange })
      : t("common.smaller", { percent: Math.abs(sizeChange) });

  const formatSpecific = originalFormat.includes("jpeg")
    ? t("formatConversion.formatSpecific.jpeg")
    : "";

  return t("formatConversion.sections.importantInfo.message", {
    originalFormat: originalName,
    finalFormat: targetName,
    sizeDescription,
    formatSpecific,
  });
});

function getFormatDisplayName(mimeType: string): string {
  return t(`formatConversion.formats.${mimeType}`, mimeType);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
</script>

<style scoped>
.format-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}

.format-badge.original {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #f59e0b;
}

.format-badge.converted {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #10b981;
}
</style>
