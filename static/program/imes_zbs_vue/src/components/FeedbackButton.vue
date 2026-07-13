<template>
  <div id="feedbackContainer">
    <div class="feedback-icon-wrapper" title="反馈" @click="openModal">
      <svg width="16" height="16" viewBox="0 0 16 16" class="feedback-icon">
        <path d="M9.5 1.5a1 1 0 00-1 1v2a1 1 0 001 1V7l1.8-1.5h2.2a1 1 0 001-1v-2a1 1 0 00-1-1h-4zM5 4a2 2 0 100 4 2 2 0 000-4zm2.5 5h-5C1.67 9 1 9.67 1 10.5c0 1.12.46 2.01 1.21 2.61.74.6 1.74.89 2.79.89s2.05-.29 2.79-.89c.75-.6 1.21-1.5 1.21-2.61C9 9.67 8.33 9 7.5 9z"/>
      </svg>
      <span class="feedback-text">反馈</span>
    </div>

    <div class="modal fade" ref="modalRef" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h4 class="modal-title">页面反馈</h4>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info mb-3" role="alert">
              <i class="bi bi-info-circle me-2"></i>
              <strong>反馈提示：</strong>请告诉我们您在当前页面遇到的问题，或提出改进建议。您的反馈将帮助我们优化页面体验。--数智中心开发科
            </div>
            <form @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label for="userFeedback" class="form-label">反馈内容</label>
                <textarea class="form-control rounded-4" id="userFeedback" v-model="feedback" rows="3" placeholder="请描述您在当前页面遇到的问题、bug或功能建议..." required></textarea>
              </div>
              <button type="submit" class="btn btn-primary rounded-4">提交反馈</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Modal } from 'bootstrap'
import { fetchDataFromAPI } from '@/api'

const feedback = ref('')
const modalRef = ref(null)
let modalInstance = null

function openModal() {
  if (!modalInstance) modalInstance = new Modal(modalRef.value)
  modalInstance.show()
}

async function handleSubmit() {
  if (!feedback.value.trim()) return
  try {
    const userName = window.userName || ''
    const response = await fetchDataFromAPI('647', {
      userFeedback: feedback.value,
      sourceAddress: window.location.href,
      fromName: 'feedbackForm',
      userName
    })
    alert(response.data?.msg || '提交成功')
    modalInstance?.hide()
    feedback.value = ''
  } catch (e) {
    alert('反馈提交失败，请稍后再试。')
  }
}
</script>
