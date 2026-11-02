<template>
  <div class="pl-loading" role="status">
    <span class="pl-loading-ring" aria-hidden="true"></span>
    <span class="visually-hidden">Loading</span>
  </div>
</template>

<style scoped>
/* Shown only if a page takes longer than a moment to load. It costs no images or scripts. */
.pl-loading {
  display: grid;
  place-items: center;
  min-height: 70vh;
}
.pl-loading-ring {
  width: 44px;
  height: 44px;
  border: 3px solid #a77a4844;
  border-top-color: #e7bf7c;
  border-radius: 50%;
}
html[data-motion="full"] .pl-loading-ring {
  animation: pl-loading-spin 900ms linear infinite;
}
@keyframes pl-loading-spin {
  to {
    rotate: 360deg;
  }
}
</style>
