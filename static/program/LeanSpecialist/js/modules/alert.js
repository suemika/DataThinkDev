

export const Alert = {
    /**
     * 显示成功提示框
     * @param {string} title - 标题
     * @param {string} message - 消息内容
     * @param {string} [confirmText='确定'] - 确认按钮文本
     */
    success(title, message, confirmText = '确定') {
        return Swal.fire({
            title,
            html: message,
            icon: 'success',
            confirmButtonText: confirmText,
            confirmButtonColor: '#28a745',
            timer: 3000,
            timerProgressBar: true,
            backdrop: 'rgba(0,0,0,0.4)'
        });
    },

    /**
     * 显示错误提示框
     * @param {string} title - 标题
     * @param {string} message - 消息内容
     * @param {string} [confirmText='确定'] - 确认按钮文本
     */
    error(title, message, confirmText = '确定') {
        return Swal.fire({
            title,
            html: message,
            icon: 'error',
            confirmButtonText: confirmText,
            confirmButtonColor: '#dc3545',
            backdrop: 'rgba(0,0,0,0.4)'
        });
    },

    /**
     * 显示警告提示框
     * @param {string} title - 标题
     * @param {string} message - 消息内容
     * @param {string} [confirmText='确定'] - 确认按钮文本
     */
    warning(title, message, confirmText = '确定') {
        return Swal.fire({
            title,
            html: message,
            icon: 'warning',
            confirmButtonText: confirmText,
            confirmButtonColor: '#ffc107',
            backdrop: 'rgba(0,0,0,0.4)'
        });
    },

    /**
     * 显示信息提示框
     * @param {string} title - 标题
     * @param {string} message - 消息内容
     * @param {string} [confirmText='确定'] - 确认按钮文本
     */
    info(title, message, confirmText = '确定') {
        return Swal.fire({
            title,
            html: message,
            icon: 'info',
            confirmButtonText: confirmText,
            confirmButtonColor: '#17a2b8',
            backdrop: 'rgba(0,0,0,0.4)'
        });
    },

    /**
     * 显示确认对话框
     * @param {string} title - 标题
     * @param {string} message - 消息内容
     * @param {string} confirmText - 确认按钮文本
     * @param {string} cancelText - 取消按钮文本
     * @param {string} [icon='question'] - 图标类型
     */
    confirm(title, message, confirmText, cancelText, icon = 'question') {
        return Swal.fire({
            title,
            html: message,
            icon,
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: cancelText,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#6c757d',
            backdrop: 'rgba(0,0,0,0.4)',
            allowOutsideClick: false
        });
    },

    /**
     * 显示自定义HTML内容的提示框
     * @param {object} options - SweetAlert2配置选项
     */
    custom(options) {
        const defaults = {
            backdrop: 'rgba(0,0,0,0.4)',
            allowOutsideClick: false
        };
        return Swal.fire({ ...defaults, ...options });
    }
};