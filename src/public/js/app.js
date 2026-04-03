document.addEventListener("DOMContentLoaded", () => {
  const socket = window.io ? window.io() : null;
  const role = document.body.dataset.role;
  const userId = document.body.dataset.userId;
  const countdownNodes = document.querySelectorAll("[data-countdown]");
  const orderTypeSelect = document.getElementById("orderType");
  const deliveryLocationSelect = document.getElementById("deliveryLocation");
  const orderTypeNote = document.getElementById("orderTypeNote");
  const bookingForms = document.querySelectorAll(".table-booking-form");
  const pickupPopup = document.getElementById("pickupPopup");
  const pickupPopupClose = document.getElementById("pickupPopupClose");
  const notificationHost = document.getElementById("notificationHost");
  const TOAST_DELAY_MS = 2000;
  const LIVE_RELOAD_DELAY_MS = 4500;
  let audioContext;

  function ensureAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    return audioContext;
  }

  function unlockAudio() {
    ensureAudioContext();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
  }

  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
  window.addEventListener("touchstart", unlockAudio, { once: true });

  function playNotificationSound(tone = "info", soundType = "default") {
    try {
      const context = ensureAudioContext();
      if (!context) {
        return;
      }

      const now = context.currentTime;
      const frequencyMap = { info: 660, success: 880, danger: 480 };

      function playBeep(startTime, frequency, duration, volume = 0.12) {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, startTime);
        gainNode.gain.setValueAtTime(0.0001, startTime);
        gainNode.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration + 0.02);
      }

      if (soundType === "clock") {
        playBeep(now, 1180, 0.08, 0.09);
        playBeep(now + 0.22, 1180, 0.08, 0.09);
        playBeep(now + 0.44, 980, 0.1, 0.1);
        playBeep(now + 0.84, 1180, 0.08, 0.09);
        playBeep(now + 1.06, 1180, 0.08, 0.09);
        playBeep(now + 1.28, 980, 0.1, 0.1);
        return;
      }

      playBeep(now, frequencyMap[tone] || 660, 0.38, 0.14);
    } catch (error) {
      console.error("Notification sound failed", error);
    }
  }

  function renderToast({ title, message, tone = "info", soundType = "default" }) {
    if (!notificationHost) {
      return;
    }

    const toast = document.createElement("div");
    toast.className = `site-toast site-toast-${tone}`;
    toast.innerHTML = `
      <div class="site-toast-head">
        <strong>${title}</strong>
        <button type="button" class="site-toast-close" aria-label="Close notification">x</button>
      </div>
      <div class="site-toast-body">${message}</div>
    `;

    const closeButton = toast.querySelector(".site-toast-close");
    closeButton?.addEventListener("click", () => toast.remove());

    notificationHost.appendChild(toast);
    playNotificationSound(tone, soundType);

    window.setTimeout(() => {
      toast.classList.add("site-toast-hide");
      window.setTimeout(() => toast.remove(), 250);
    }, 5000);
  }

  function showToast(payload, options = {}) {
    const delay = options.delayMs ?? TOAST_DELAY_MS;
    if (delay <= 0) {
      renderToast(payload);
      return;
    }

    window.setTimeout(() => {
      renderToast(payload);
    }, delay);
  }

  function formatDistance(target) {
    const distance = new Date(target).getTime() - Date.now();
    if (distance <= 0) {
      return "00:00";
    }

    const totalSeconds = Math.floor(distance / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function tickCountdowns() {
    countdownNodes.forEach((node) => {
      if (node.dataset.countdown) {
        node.textContent = formatDistance(node.dataset.countdown);
      }
    });
  }

  if (countdownNodes.length) {
    tickCountdowns();
    window.setInterval(tickCountdowns, 1000);
  }

  function syncOrderForm() {
    if (!orderTypeSelect || !deliveryLocationSelect || !orderTypeNote) {
      return;
    }

    const value = orderTypeSelect.value;

    deliveryLocationSelect.disabled = value !== "delivery";
    deliveryLocationSelect.required = value === "delivery";

    if (value !== "delivery") {
      deliveryLocationSelect.value = "";
    }

    if (value === "dine-in") {
      orderTypeNote.textContent = "Dine-in selected. Reserve a table below before placing your order.";
    } else if (value === "takeaway") {
      orderTypeNote.textContent = "Takeaway selected. You will be notified as soon as your order is ready for pickup.";
    } else {
      orderTypeNote.textContent = "Delivery selected. Please choose your campus delivery location.";
    }

    bookingForms.forEach((form) => {
      const button = form.querySelector("button");
      const hiddenInput = form.querySelector(".selected-order-type-input");
      const isDineIn = value === "dine-in";
      const unavailable = button?.hasAttribute("data-static-disabled");

      if (hiddenInput) {
        hiddenInput.value = value;
      }

      if (!button) {
        return;
      }

      if (unavailable) {
        button.disabled = true;
        return;
      }

      button.disabled = !isDineIn;
      form.classList.toggle("table-booking-disabled", !isDineIn);
    });
  }

  if (orderTypeSelect) {
    syncOrderForm();
    orderTypeSelect.addEventListener("change", syncOrderForm);
  }

  function syncPickupPopup() {
    if (!pickupPopup) {
      return;
    }

    const orderId = pickupPopup.dataset.orderId;
    const dismissedFor = window.localStorage.getItem("pickupPopupDismissedFor");
    if (dismissedFor === orderId) {
      pickupPopup.classList.add("pickup-modal-hidden");
    } else {
      pickupPopup.classList.remove("pickup-modal-hidden");
    }
  }

  function upsertPickupPopup(order) {
    if (!order || !order.pickupDeadline) {
      return;
    }

    const existing = document.getElementById("pickupPopup");
    if (existing) {
      existing.remove();
    }

    const backdrop = document.createElement("div");
    backdrop.className = "pickup-modal-backdrop";
    backdrop.id = "pickupPopup";
    backdrop.dataset.orderId = order._id;

    const itemSummary = (order.items || [])
      .map((item) => `${item.name} x${item.quantity}`)
      .join(", ");
    const pickupPenalty = ((order.subtotalAmount || order.totalAmount) * 2) || 0;

    backdrop.innerHTML = `
      <div class="pickup-modal-card">
        <div class="pickup-modal-head">
          <div>
            <p class="eyebrow mb-2">Pickup Alert</p>
            <h2 class="mb-1">Your order is ready</h2>
          </div>
          <button type="button" class="pickup-close" id="pickupPopupClose" aria-label="Close popup">x</button>
        </div>
        <div class="rule-box mb-3">
          <div class="d-flex justify-content-between align-items-start gap-3">
            <div>
              <strong>Collect now from ${order.serviceLocation || "Pickup Counter"}</strong>
              <div class="small text-secondary mt-1">${itemSummary}</div>
            </div>
            <span class="price-tag">Rs. ${order.totalAmount}</span>
          </div>
        </div>
        <div class="countdown-grid">
          <div>
            <span class="countdown-label">Pickup ends in</span>
            <strong class="countdown-value countdown-urgent" data-countdown="${new Date(order.pickupDeadline).toISOString()}">00:00</strong>
          </div>
          <div>
            <span class="countdown-label">Penalty if missed</span>
            <strong class="countdown-value text-danger">Rs. ${pickupPenalty}</strong>
          </div>
        </div>
        <p class="small text-secondary mt-3 mb-0">Please collect before the timer ends to avoid penalty.</p>
      </div>
    `;

    document.body.appendChild(backdrop);

    const closeButton = backdrop.querySelector("#pickupPopupClose");
    closeButton?.addEventListener("click", () => {
      window.localStorage.setItem("pickupPopupDismissedFor", order._id);
      backdrop.classList.add("pickup-modal-hidden");
    });

    const countdownTargets = backdrop.querySelectorAll("[data-countdown]");
    countdownTargets.forEach((node) => {
      node.textContent = formatDistance(node.dataset.countdown);
    });

    const dismissedFor = window.localStorage.getItem("pickupPopupDismissedFor");
    if (dismissedFor === order._id) {
      backdrop.classList.add("pickup-modal-hidden");
    }
  }

  if (pickupPopupClose && pickupPopup) {
    pickupPopupClose.addEventListener("click", () => {
      window.localStorage.setItem("pickupPopupDismissedFor", pickupPopup.dataset.orderId);
      pickupPopup.classList.add("pickup-modal-hidden");
    });
    syncPickupPopup();
  }

  document.querySelectorAll(".flash-stack .alert").forEach((alert) => {
    showToast({
      title: alert.classList.contains("alert-danger") ? "Action needed" : "Update",
      message: alert.textContent.trim(),
      tone: alert.classList.contains("alert-danger") ? "danger" : "success"
    }, { delayMs: 0 });
    alert.remove();
  });

  if (socket && userId) {
    socket.emit("join-user-room", userId);
  }

  if (socket && role) {
    socket.emit("join-role-room", role);
  }

  if (socket) {
    socket.on("notification", (payload) => {
      const toneMap = {
        penalty: "danger",
        "table-penalty": "danger",
        "order-ready": "success",
        "order-delivered": "success",
        "new-order": "info",
        "table-reserved": "info"
      };
      const soundTypeMap = {
        "order-ready": "clock"
      };

      showToast({
        title: payload.title || "Notification",
        message: payload.message || "",
        tone: toneMap[payload.type] || "info",
        soundType: soundTypeMap[payload.type] || "default"
      });
    });

    socket.on("dashboard:refresh", () => {
      window.setTimeout(() => {
        window.location.reload();
      }, LIVE_RELOAD_DELAY_MS);
    });

    socket.on("order:update", (payload) => {
      if (payload?.eventType === "ready") {
        window.localStorage.removeItem("pickupPopupDismissedFor");
        window.setTimeout(() => {
          upsertPickupPopup(payload.order);
        }, TOAST_DELAY_MS);
      }

      if (payload?.eventType === "delivered" && payload?.order?._id) {
        window.setTimeout(() => {
          window.location.href = `/consumer/orders/${payload.order._id}/thank-you`;
        }, TOAST_DELAY_MS);
        return;
      }

      window.setTimeout(() => {
        window.location.reload();
      }, LIVE_RELOAD_DELAY_MS);
    });
  }
});
