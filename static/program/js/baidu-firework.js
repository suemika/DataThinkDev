/**
 * 百度官方烟花效果 - 页面上半部分显示版
 * 适配石横特钢电话查询页面，仅在上半部分显示烟花效果
 * 新增功能：用户可点击页面任意位置触发小型互动烟花（永久可用）
 */
(function() {
    // 防止重复加载
    if (document.getElementById('baidu-firework-container')) return;

    // ===================== 1. 创建DOM结构和样式（上半部分） =====================
    function createFireworkDOM() {
        // 外层容器 - 限制为页面上半部分
        const container = document.createElement('div');
        container.id = 'baidu-firework-container';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100vw';    // 全屏宽度
        container.style.height = '60vh';    // 仅占视口60%高度（上半部分）
        container.style.zIndex = '9999';
        container.style.pointerEvents = 'none';
        container.style.opacity = '1';
        container.style.transition = 'opacity 2s ease';
        container.style.background = 'transparent';
        container.style.overflow = 'hidden';
        document.body.appendChild(container);

        // Canvas画布 - 铺满容器
        const canvas = document.createElement('canvas');
        canvas.className = 'firework-canvas';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        container.appendChild(canvas);

        return { container, canvas };
    }

    // ===================== 2. 核心配置（调整上半部分相关） =====================
    const FIREWORK_CONFIG = {
        particleCount: 40,        // 每个烟花的粒子数量
        gravity: 0.2,             // 重力加速度
        friction: 0.95,           // 摩擦力（速度衰减）
        minSpeed: 2,              // 粒子最小速度
        maxSpeed: 7,              // 粒子最大速度
        minDecay: 0.01,           // 最小透明度衰减
        maxDecay: 0.025,          // 最大透明度衰减
        trailLength: 10,          // 粒子轨迹长度（拖尾）
        lifetime: 8000,           // 粒子生命周期
        spawnChance: 0.1,         // 自动生成烟花的概率
        autoShowDuration: 5000,   // 自动烟花显示时长（8秒）
        fadeDuration: 2000,       // 渐隐时长（2秒）
        topOffset: 0,             // 取消顶部偏移
        fireworkAreaRatio: 0.6,   // 烟花生成区域占容器高度的比例（60%，上半部分核心区）
        // 马年喜庆配色（红/橙/黄系）
        themes: [
            { h: 0, s: 100, l: 60 },   // 中国红
            { h: 35, s: 100, l: 55 },  // 富贵橙
            { h: 10, s: 100, l: 55 },  // 橘红色
            { h: 45, s: 95, l: 65 }    // 鎏金黄
        ]
    };

    // ===================== 3. 烟花粒子类 =====================
    class FireworkParticle {
        constructor(x, y, hue, birthTime) {
            this.x = x;
            this.y = y;
            this.coordinates = [];
            // 初始化粒子轨迹（拖尾）
            for (let i = 0; i < FIREWORK_CONFIG.trailLength; i++) {
                this.coordinates.push([x, y]);
            }
            this.angle = Math.random() * Math.PI * 2; // 随机运动角度
            this.speed = Math.random() * (FIREWORK_CONFIG.maxSpeed - FIREWORK_CONFIG.minSpeed) + FIREWORK_CONFIG.minSpeed;
            this.friction = FIREWORK_CONFIG.friction;
            this.gravity = FIREWORK_CONFIG.gravity;
            this.hue = hue + (20 * Math.random() - 10); // 颜色随机偏移
            this.saturation = 90 + 10 * Math.random();
            this.lightness = 50 + 20 * Math.random();
            this.alpha = 1; // 初始透明度
            this.decay = Math.random() * (FIREWORK_CONFIG.maxDecay - FIREWORK_CONFIG.minDecay) + FIREWORK_CONFIG.minDecay;
            this.birth = birthTime; // 粒子生成时间
            this.lifetime = FIREWORK_CONFIG.lifetime;
        }

        // 更新粒子位置和状态
        update(currentTime) {
            this.coordinates.pop();
            this.coordinates.unshift([this.x, this.y]);
            this.speed *= this.friction; // 速度衰减
            // 计算新位置（角度+速度+重力）
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed + this.gravity;
            this.alpha -= this.decay; // 透明度衰减
            // 判断粒子是否存活
            return !(currentTime - this.birth >= this.lifetime || this.alpha <= this.decay);
        }

        // 绘制粒子（轨迹+圆点）
        draw(ctx) {
            ctx.save();
            ctx.lineCap = "round"; // 轨迹线端点圆润

            // 绘制粒子轨迹（拖尾效果）
            for (let i = 0; i < this.coordinates.length - 1; i++) {
                const [x1, y1] = this.coordinates[i];
                const [x2, y2] = this.coordinates[i + 1];
                const opacity = this.alpha * (this.coordinates.length - i) / this.coordinates.length;

                // 使用HSLA颜色，支持透明度渐变
                ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${opacity})`;
                ctx.lineWidth = 2.5 * opacity; // 轨迹宽度随透明度衰减
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            // 绘制粒子圆点
            ctx.beginPath();
            ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 90%, ${this.alpha})`;
            ctx.arc(this.x, this.y, 1.2, 0, 2 * Math.PI);
            ctx.fill();

            ctx.restore();
        }
    }

    // ===================== 4. 小烟花系统类 =====================
    class MiniFirework {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.particles = [];
            this.isAlive = true;
            this.createdAt = performance.now();
            this.duration = 2000; // 小烟花持续时间 2秒

            // 小烟花配置（更少的粒子、更小的范围）
            const config = {
                count: 20, // 粒子数量少
                minSpeed: 1,
                maxSpeed: 3,
                gravity: 0.1,
                friction: 0.96,
                // 使用更明亮的颜色（例如金银色系，与大烟花区分）
                hues: [50, 60, 0, 200] // 金色、亮黄、红、蓝
            };

            // 随机选择小烟花的配色方案
            const hue = config.hues[Math.floor(Math.random() * config.hues.length)];

            // 生成小烟花粒子
            for (let i = 0; i < config.count; i++) {
                this.particles.push({
                    x: this.x,
                    y: this.y,
                    vx: (Math.random() - 0.5) * (Math.random() * (config.maxSpeed - config.minSpeed) + config.minSpeed),
                    vy: (Math.random() - 0.5) * (Math.random() * (config.maxSpeed - config.minSpeed) + config.minSpeed),
                    life: 1.0,
                    decay: Math.random() * 0.02 + 0.01,
                    size: Math.random() * 1.5 + 0.5,
                    hue: hue + (Math.random() * 30 - 15), // 颜色随机偏移
                    saturation: 80 + Math.random() * 20,
                    lightness: 50 + Math.random() * 30,
                    gravity: config.gravity,
                    friction: config.friction
                });
            }
        }

        update() {
            if (!this.isAlive) return false;

            const now = performance.now();
            if (now - this.createdAt > this.duration) {
                this.isAlive = false;
                return false;
            }

            // 更新所有粒子
            for (let particle of this.particles) {
                // 应用物理效果
                particle.vx *= particle.friction;
                particle.vy *= particle.friction;
                particle.vy += particle.gravity;

                // 更新位置
                particle.x += particle.vx;
                particle.y += particle.vy;

                // 衰减生命值
                particle.life -= particle.decay;
                if (particle.life <= 0) particle.life = 0;
            }

            // 如果所有粒子都消失了，标记为可回收
            return this.particles.some(p => p.life > 0);
        }

        draw(ctx) {
            if (!this.isAlive) return;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            for (let particle of this.particles) {
                if (particle.life <= 0) continue;

                // 绘制粒子（圆形）
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);

                // 使用HSLA颜色，支持透明度
                ctx.fillStyle = `hsla(${particle.hue}, ${particle.saturation}%, ${particle.lightness}%, ${particle.life})`;
                ctx.fill();

                // 添加发光效果
                ctx.shadowBlur = 5 * particle.life;
                ctx.shadowColor = `hsl(${particle.hue}, ${particle.saturation}%, 70%)`;
            }

            ctx.restore();
        }
    }

    // ===================== 5. 工具函数（适配你的页面） =====================
    // 节流函数（优化窗口大小变化）
    function throttle(fn, delay) {
        let timer = null;
        let lastTime = 0;
        let context = null;
        let args = null;

        const execute = () => {
            lastTime = Date.now();
            if (context) {
                fn.apply(context, args);
                context = args = null;
            }
        };

        const throttled = function(...params) {
            const now = Date.now();
            const elapsed = now - lastTime;
            args = params;
            context = this;

            if (!lastTime || elapsed >= delay) {
                if (timer) clearTimeout(timer);
                timer = null;
                execute();
            } else if (!timer) {
                timer = setTimeout(() => {
                    timer = null;
                    execute();
                }, delay - elapsed);
            }
        };

        throttled.cancel = () => {
            if (timer) clearTimeout(timer);
            timer = null;
            context = args = null;
        };

        return throttled;
    }

    // 避开你的页面中的搜索框（#search-box）
    function isInAvoidArea(x, y) {
        // 适配你的页面搜索框选择器
        const avoidElements = [
            document.querySelector('#search-box'),
            document.querySelector('#submitBtn'),
            document.querySelector('.dial-tip')
        ];

        for (const el of avoidElements) {
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            // 扩大避开区域，避免烟花覆盖交互元素
            const expand = 20;
            if (x >= rect.left - expand && x <= rect.right + expand &&
                y >= rect.top - expand && y <= rect.bottom + expand) {
                return true;
            }
        }
        return false;
    }

    // ===================== 6. 主逻辑 =====================
    function initFirework() {
        // 创建DOM
        const { container, canvas } = createFireworkDOM();
        const ctx = canvas.getContext('2d');
        let width = window.innerWidth;
        let height = window.innerHeight * 0.6; // 画布高度为视口60%（上半部分）
        let autoParticles = []; // 自动大烟花粒子
        let clickParticles = []; // 点击生成的大烟花粒子
        let miniFireworks = []; // 小烟花集合
        let animationId = null;
        let resizeHandler = null;
        let isAutoFireworkActive = true; // 自动烟花是否活跃

        // 初始化画布尺寸（上半部分）
        canvas.width = width;
        canvas.height = height;

        // ===================== 大烟花系统 =====================
        // 生成大烟花
        function createFirework(x, y, isAuto = false) {
            // 如果是自动烟花，强制将y坐标限制在画布高度范围内（上半部分）
            if (isAuto) {
                y = Math.min(y, height * FIREWORK_CONFIG.fireworkAreaRatio);
            }

            // 随机选择马年主题色
            const theme = FIREWORK_CONFIG.themes[Math.floor(Math.random() * FIREWORK_CONFIG.themes.length)];
            const birthTime = performance.now();

            // 生成指定数量的粒子
            for (let i = 0; i < FIREWORK_CONFIG.particleCount; i++) {
                const particle = new FireworkParticle(x, y, theme.h, birthTime);
                if (isAuto) {
                    autoParticles.push(particle);
                } else {
                    clickParticles.push(particle);
                }
            }
        }

        // ===================== 小烟花系统函数 =====================
        // 创建小烟花的函数
        function createMiniFirework(clientX, clientY) {
            const canvasRect = canvas.getBoundingClientRect();
            const x = clientX - canvasRect.left;
            const y = clientY - canvasRect.top;

            // 确保坐标在画布范围内
            if (x >= 0 && x <= width && y >= 0 && y <= height) {
                miniFireworks.push(new MiniFirework(x, y));
            }
        }

        // ===================== 动画循环 =====================
        function animate(timestamp) {
            // 清空画布
            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = "lighter"; // 颜色叠加（更亮的烟花效果）

            // 自动生成大烟花 - 限制在上半部分核心区（仅当自动烟花活跃时）
            if (isAutoFireworkActive && Math.random() < FIREWORK_CONFIG.spawnChance) {
                for (let i = 0; i < 5; i++) {
                    const x = Math.random() * width;
                    // 仅在画布高度60%的区域内生成烟花（上半部分核心区）
                    const y = Math.random() * (height * FIREWORK_CONFIG.fireworkAreaRatio);
                    const canvasRect = canvas.getBoundingClientRect();

                    // 避开指定区域
                    if (!isInAvoidArea(x + canvasRect.left, y + canvasRect.top)) {
                        createFirework(x, y, true); // true表示是自动烟花
                        break;
                    }
                }
            }

            // 更新并绘制所有自动大烟花粒子
            for (let i = autoParticles.length - 1; i >= 0; i--) {
                const particle = autoParticles[i];
                const canvasRect = canvas.getBoundingClientRect();
                const globalX = particle.x + canvasRect.left;
                const globalY = particle.y + canvasRect.top;

                // 移除进入避开区域的粒子
                if (isInAvoidArea(globalX, globalY)) {
                    autoParticles.splice(i, 1);
                }
                // 更新并绘制存活的粒子（超出上半部分则移除）
                else if (particle.y > height) {
                    autoParticles.splice(i, 1);
                }
                else if (particle.update(timestamp)) {
                    particle.draw(ctx);
                }
                // 移除死亡的粒子
                else {
                    autoParticles.splice(i, 1);
                }
            }

            // 更新并绘制点击生成的大烟花粒子
            for (let i = clickParticles.length - 1; i >= 0; i--) {
                const particle = clickParticles[i];
                const canvasRect = canvas.getBoundingClientRect();
                const globalX = particle.x + canvasRect.left;
                const globalY = particle.y + canvasRect.top;

                // 移除进入避开区域的粒子
                if (isInAvoidArea(globalX, globalY)) {
                    clickParticles.splice(i, 1);
                }
                // 更新并绘制存活的粒子（超出画布则移除）
                else if (particle.y > height || particle.x < 0 || particle.x > width) {
                    clickParticles.splice(i, 1);
                }
                else if (particle.update(timestamp)) {
                    particle.draw(ctx);
                }
                // 移除死亡的粒子
                else {
                    clickParticles.splice(i, 1);
                }
            }

            // ===================== 处理小烟花 =====================
            // 更新所有小烟花
            for (let i = miniFireworks.length - 1; i >= 0; i--) {
                const firework = miniFireworks[i];

                if (!firework.update()) {
                    // 移除已结束的小烟花
                    miniFireworks.splice(i, 1);
                } else {
                    // 绘制存活的小烟花
                    firework.draw(ctx);
                }
            }

            ctx.globalCompositeOperation = "source-over";
            animationId = requestAnimationFrame(animate);
        }

        // ===================== 事件处理 =====================
        // 窗口大小适配（上半部分）
        resizeHandler = throttle(() => {
            width = window.innerWidth;
            height = window.innerHeight * 0.6; // 同步更新画布高度为视口60%
            canvas.width = width;
            canvas.height = height;
        }, 100);

        function bindEvents() {
            // 窗口大小变化
            window.addEventListener('resize', resizeHandler);

            // ===================== 点击触发大烟花事件 =====================
            // 上半部分点击触发大烟花（不限制是否自动烟花活跃）
            window.addEventListener('mousedown', (e) => {
                if (!isInAvoidArea(e.clientX, e.clientY) && e.clientY < window.innerHeight * 0.6) {
                    const canvasRect = canvas.getBoundingClientRect();
                    createFirework(e.clientX - canvasRect.left, e.clientY - canvasRect.top, false);
                }
            });

            // 移动端触摸触发大烟花
            window.addEventListener('touchstart', (e) => {
                if (e.touches.length) {
                    const touch = e.touches[0];
                    if (!isInAvoidArea(touch.clientX, touch.clientY) && touch.clientY < window.innerHeight * 0.6) {
                        const canvasRect = canvas.getBoundingClientRect();
                        createFirework(touch.clientX - canvasRect.left, touch.clientY - canvasRect.top, false);
                    }
                }
            }, { passive: true });

            // ===================== 全页面小烟花事件 =====================
            // 绑定新的鼠标点击事件（全页面，永久可用）
            window.addEventListener('click', (e) => {
                // 避开需要避开的区域（如搜索框）
                if (!isInAvoidArea(e.clientX, e.clientY)) {
                    createMiniFirework(e.clientX, e.clientY);
                }
            });

            // 移动端触摸支持（全页面，永久可用）
            window.addEventListener('touchstart', (e) => {
                if (e.touches.length) {
                    const touch = e.touches[0];
                    if (!isInAvoidArea(touch.clientX, touch.clientY)) {
                        createMiniFirework(touch.clientX, touch.clientY);
                    }
                }
            }, { passive: true });
        }

        // ===================== 生命周期管理 =====================
        // 停止自动烟花（保留点击功能）
        function stopAutoFirework() {
            isAutoFireworkActive = false;
            // 清空自动烟花粒子
            autoParticles = [];
        }

        // 停止所有动画和事件
        function stopAll() {
            if (animationId) cancelAnimationFrame(animationId);
            if (resizeHandler) resizeHandler.cancel();

            // 移除所有事件监听
            window.removeEventListener('resize', resizeHandler);

            // 清空所有粒子
            autoParticles = [];
            clickParticles = [];
            miniFireworks = [];
        }

        // 移除整个容器（不推荐，会失去点击功能）
        function removeContainer() {
            stopAll();
            container.remove();
        }

        // 初始化执行
        bindEvents();
        animate(performance.now());

        // 8秒后停止自动烟花，但保留点击功能
        setTimeout(() => {
            stopAutoFirework();
            // 可选：给用户一个提示，说明点击功能依然可用
            // console.log('自动烟花结束，但点击功能依然可用！');
        }, FIREWORK_CONFIG.autoShowDuration);
    }

    // ===================== 7. 等待页面加载完成后初始化 =====================
    function initAfterLoad() {
        // 等待加载遮罩消失后再初始化烟花
        const checkLoading = setInterval(() => {
            const loadingOverlay = document.getElementById('loading-overlay');
            if (!loadingOverlay || loadingOverlay.style.display === 'none') {
                clearInterval(checkLoading);
                initFirework();
            }
        }, 200);

        // 超时兜底（5秒后强制初始化）
        setTimeout(() => {
            clearInterval(checkLoading);
            initFirework();
        }, 5000);
    }

    if (document.readyState === 'complete') {
        initAfterLoad();
    } else {
        document.addEventListener('DOMContentLoaded', initAfterLoad);
    }
})();