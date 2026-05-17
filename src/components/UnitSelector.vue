<template><select v-model="selected" @change="$emit('change', selected)"><option v-for="u in units" :key="u.id" :value="u.id">{{ u.name }}</option></select></template>
<script setup>import { defineProps, defineModel } from 'vue'
defineProps({ units: Array })
const selected = defineModel()
</script>