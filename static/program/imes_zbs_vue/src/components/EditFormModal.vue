<template>
  <div class="modal fade" ref="modalRef" tabindex="-1" data-bs-backdrop="static" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h4 class="modal-title">
            <i :class="mode === 'add' ? 'bi bi-plus-circle me-2' : 'bi bi-pencil-square me-2'"></i>
            {{ mode === 'add' ? '新增发货通知单' : '编辑发货通知单' }}
          </h4>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <div v-for="section in sections" :key="section.title">
              <h6 class="form-section-title">
                <i :class="'bi ' + section.icon + ' me-1'"></i>{{ section.title }}
              </h6>
              <div class="modal-form-row">
                <div v-for="field in section.fields" :key="field.key" :class="field.col" class="modal-form-col">
                  <label class="form-label">
                    {{ field.key }}
                    <span v-if="field.required" class="text-danger">*</span>
                  </label>
                  <input
                    v-if="field.type !== 'date'"
                    type="text"
                    class="form-control"
                    :required="field.required"
                    v-model="form[field.key]"
                  />
                  <input
                    v-else
                    type="date"
                    class="form-control"
                    v-model="form[field.key]"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            <i class="bi bi-x-circle me-1"></i>取消
          </button>
          <button type="button" class="btn btn-primary" @click="handleSubmit">
            <i class="bi bi-check-circle me-1"></i>保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onBeforeUnmount } from 'vue'
import { Modal } from 'bootstrap'
import { FORM_SECTIONS, getFormFields } from '@/utils/constants'

const props = defineProps({
  mode: { type: String, default: 'add' },
  initialData: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['save'])

const sections = FORM_SECTIONS
const modalRef = ref(null)
let modalInstance = null

const form = reactive({})

function initFormFields() {
  const fields = getFormFields()
  fields.forEach(f => { form[f] = '' })
}

initFormFields()

function resetForm() {
  const fields = getFormFields()
  fields.forEach(f => { form[f] = '' })
}

function fillForm(data) {
  const fields = getFormFields()
  fields.forEach(f => { form[f] = data[f] || '' })
}

watch(() => props.mode, (newMode) => {
  if (newMode === 'add') {
    resetForm()
  } else if (props.initialData) {
    fillForm(props.initialData)
  }
})

watch(() => props.initialData, (data) => {
  if (props.mode === 'edit' && data) {
    fillForm(data)
  }
})

function show() {
  if (!modalInstance) {
    modalInstance = new Modal(modalRef.value)
    modalRef.value.addEventListener('hidden.bs.modal', () => {
      resetForm()
    })
  }
  modalInstance.show()
}

function hide() {
  modalInstance?.hide()
}

function handleSubmit() {
  if (!form['发货通知单号']) {
    emit('save', { success: false, msg: '请输入发货通知单号' })
    return
  }
  emit('save', { success: true, data: { ...form } })
}

onBeforeUnmount(() => {
  modalInstance?.dispose()
})

defineExpose({ show, hide })
</script>
