<template><input v-model="q" @input="$emit('search', q)" placeholder="搜索单词/释义" /></template>
<script setup>import { ref, defineEmits } from 'vue'
const q = ref('')
defineEmits(['search'])
</script>