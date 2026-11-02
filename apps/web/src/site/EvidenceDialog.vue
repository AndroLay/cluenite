<script setup lang="ts">
/* global MouseEvent, HTMLDialogElement */
import { onBeforeUnmount, onMounted, ref, useId } from "vue";
import SiteIcon from "./SiteIcon.vue";

withDefaults(defineProps<{ title: string; code?: string; text?: string; action?: string; discovered?: boolean }>(), { code: "", text: "", action: "", discovered: false });
const emit = defineEmits<{ close: []; action: [] }>();
const dialog = ref<HTMLDialogElement | null>(null);
const titleId = useId();
const target = document.fullscreenElement ?? document.body;
onMounted(() => dialog.value?.showModal());
onBeforeUnmount(() => dialog.value?.close());
function outside(event: MouseEvent): void {
  const box = dialog.value?.getBoundingClientRect();
  if (box && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) emit("close");
}
</script>

<template>
  <Teleport :to="target">
    <dialog ref="dialog" class="evidence-dialog" :aria-labelledby="titleId" @cancel.prevent="emit('close')" @click="outside">
      <div class="evidence-dialog-head"><span>{{ discovered ? 'New discovery' : 'Evidence file' }}<code v-if="code">{{ code }}</code></span><button type="button" autofocus aria-label="Close evidence" @click="emit('close')"><SiteIcon name="close" size="22px" /></button></div>
      <div v-if="$slots.art" class="evidence-dialog-art"><slot name="art" /></div>
      <div class="evidence-dialog-copy"><h2 :id="titleId">{{ title }}</h2><p v-if="text">{{ text }}</p><slot /></div>
      <footer><slot name="footer" /><button v-if="action" type="button" class="evidence-dialog-primary" @click="emit('action')"><SiteIcon name="link" />{{ action }}</button><button type="button" @click="emit('close')">Back to the case</button></footer>
    </dialog>
  </Teleport>
</template>

<style scoped>
.evidence-dialog { margin: auto; box-sizing: border-box; width: min(620px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); padding: 0; overflow: auto; overscroll-behavior: contain; border: 1px solid #a98150; border-radius: 12px; background: #eee0c3; color: #2f2116; box-shadow: 0 30px 100px #000b; font-family: var(--font-body); }
.evidence-dialog[open] { animation: evidence-arrive 420ms cubic-bezier(.16, 1, .3, 1); }
.evidence-dialog::backdrop { background: #0b0705bd; }
.evidence-dialog-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; border-bottom: 1px solid #77543740; }
.evidence-dialog-head > span { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 12px; font-weight: 600; }
.evidence-dialog code { color: #7c4727; font-size: 11px; }
.evidence-dialog-head button { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; background: none; border: 0; color: #53381f; cursor: pointer; }
.evidence-dialog-art { display: grid; grid-template-rows: minmax(0, 1fr); place-items: center; height: clamp(150px, 26dvh, 240px); overflow: hidden; background: radial-gradient(ellipse at 50% 55%, #fff8e8, #dbc69c); }
.evidence-dialog-art :deep(svg), .evidence-dialog-art :deep(img) { min-width: 0; min-height: 0; max-width: 100%; max-height: 100%; width: auto; height: 100%; object-fit: contain; }
.evidence-dialog-copy { padding: 24px 30px; }
.evidence-dialog h2 { margin: 0 0 12px; font: 600 clamp(26px, 4vw, 36px)/1.05 var(--font-display); text-wrap: balance; }
.evidence-dialog p { margin: 0; font-size: 16px; line-height: 1.65; }
.evidence-dialog footer { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; padding: 0 24px 24px; }
.evidence-dialog footer button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 10px 16px; border: 1px solid #80614480; border-radius: 8px; background: #e1cda6; color: #352313; font: 600 13px var(--font-body); cursor: pointer; }
.evidence-dialog footer .evidence-dialog-primary { background: #513720; color: #fff0d4; border-color: #513720; }
.evidence-dialog button:focus-visible { outline: 2px solid #6f441f; outline-offset: 3px; }
@keyframes evidence-arrive { from { opacity: 0; transform: perspective(900px) translateY(34px) rotateX(6deg) scale(.96); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .evidence-dialog[open] { animation: none; } }
:global(html[data-motion="reduced"]) .evidence-dialog[open] { animation: none; }
@media (max-width: 500px) { .evidence-dialog-copy { padding: 20px; } .evidence-dialog footer { padding: 0 20px 20px; } }
</style>
