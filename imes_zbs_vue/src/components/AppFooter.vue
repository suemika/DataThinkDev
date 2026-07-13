<template>
  <footer>
    <div id="divPowerBy">
      <div class="body-footer">
        <span id="spanPower">
          Copyright © {{ currentYear }}
          <a href="http://edi.sdstg.com/" target="_self" rel="noopener" class="footer-link">石横特钢集团有限公司</a>
          版权所有 数智中心 <span>提供技术支持</span>
        </span>
      </div>
    </div>
  </footer>
</template>

<script setup>
const currentYear = new Date().getFullYear()
</script>
