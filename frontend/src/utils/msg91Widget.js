// Utility to invoke Brevo Email OTP verification modal in the browser

/**
 * Triggers Brevo Email OTP verification.
 * Returns a promise that resolves with the access token when user verifies OTP.
 */
export async function startOtpWidget(identifier = "") {
  if (!identifier) {
    throw new Error("Email address is required for OTP verification.");
  }

  let initialCode = "";
  // Trigger Brevo Email OTP dispatch via backend
  try {
    const sendRes = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier })
    });
    const sendData = await sendRes.json();
    console.log("Brevo Email OTP Send status:", sendData);
    if (sendData?.fallback && sendData?.otpCode) {
      initialCode = sendData.otpCode;
    }
  } catch (err) {
    console.warn("OTP send trigger warning:", err);
  }

  return new Promise((resolve, reject) => {
    renderInlineOtpModal(identifier, resolve, reject, initialCode);
  });
}

function renderInlineOtpModal(identifier, resolve, reject, initialCode = "") {
  const existing = document.getElementById("talentera-otp-modal-root");
  if (existing) existing.remove();

  const modalContainer = document.createElement("div");
  modalContainer.id = "talentera-otp-modal-root";
  modalContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(6, 21, 42, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  modalContainer.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #0A1F3D 0%, #152A4A 100%);
      border: 1px solid rgba(229,168,46,0.35);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      border-radius: 20px;
      padding: 36px 32px;
      max-width: 440px;
      width: 90%;
      color: #FAF7F0;
      text-align: center;
      position: relative;
      animation: modalFadeIn 0.25s ease-out;
    ">
      <style>
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .otp-digit-input {
          width: 44px;
          height: 52px;
          font-size: 22px;
          font-weight: 800;
          text-align: center;
          background: rgba(0, 0, 0, 0.4);
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          color: #FAF7F0;
          outline: none;
          transition: all 0.2s;
        }
        .otp-digit-input:focus {
          border-color: #E5A82E;
          box-shadow: 0 0 0 3px rgba(229,168,46,0.25);
          background: rgba(0, 0, 0, 0.6);
        }
      </style>

      <div style="font-size: 32px; margin-bottom: 8px;">📧</div>
      <h3 style="font-size: 22px; font-weight: 800; margin: 0 0 6px 0; color: #FAF7F0;">Verify Email OTP</h3>
      <p style="font-size: 13px; color: rgba(255, 255, 255, 0.65); margin: 0 0 20px 0; line-height: 1.5;">
        A 6-digit verification code was sent via Brevo Email to <br/>
        <strong style="color: #E5A82E;">${identifier || "your email address"}</strong>
      </p>

      <div id="otp-error-banner" style="display: none; background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.4); border-radius: 8px; padding: 10px; font-size: 12.5px; color: #F87171; margin-bottom: 16px;"></div>

      <div id="otp-input-group" style="display: flex; justify-content: center; gap: 8px; margin-bottom: 20px;">
        <input type="text" maxlength="1" class="otp-digit-input" data-index="0" autofocus />
        <input type="text" maxlength="1" class="otp-digit-input" data-index="1" />
        <input type="text" maxlength="1" class="otp-digit-input" data-index="2" />
        <input type="text" maxlength="1" class="otp-digit-input" data-index="3" />
        <input type="text" maxlength="1" class="otp-digit-input" data-index="4" />
        <input type="text" maxlength="1" class="otp-digit-input" data-index="5" />
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 22px; padding: 0 4px;">
        <span style="color: rgba(255,255,255,0.5);">Didn't receive email?</span>
        <button id="otp-resend-btn" type="button" style="background: none; border: none; color: #E5A82E; font-weight: 700; cursor: pointer; text-decoration: underline;">Resend Email OTP</button>
      </div>

      <div style="display: flex; gap: 10px;">
        <button id="otp-modal-cancel" type="button" style="
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        ">Cancel</button>

        <button id="otp-modal-submit" type="button" style="
          flex: 2;
          padding: 12px;
          border-radius: 10px;
          border: none;
          background: #E5A82E;
          color: #0A1F3D;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
        ">Verify & Sign In →</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalContainer);

  const inputs = Array.from(modalContainer.querySelectorAll(".otp-digit-input"));
  const submitBtn = modalContainer.querySelector("#otp-modal-submit");
  const cancelBtn = modalContainer.querySelector("#otp-modal-cancel");
  const resendBtn = modalContainer.querySelector("#otp-resend-btn");
  const errorBanner = modalContainer.querySelector("#otp-error-banner");

  const showError = (msg) => {
    errorBanner.style.display = "block";
    errorBanner.innerText = msg;
  };

  const clearError = () => {
    errorBanner.style.display = "none";
    errorBanner.innerText = "";
  };

  inputs.forEach((input, idx) => {
    input.addEventListener("input", (e) => {
      clearError();
      const val = e.target.value;
      if (val && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && idx > 0) {
        inputs[idx - 1].focus();
      }
    });

    input.addEventListener("paste", (e) => {
      e.preventDefault();
      clearError();
      const pasted = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
      if (pasted) {
        pasted.split("").forEach((char, i) => {
          if (inputs[i]) inputs[i].value = char;
        });
        if (inputs[Math.min(pasted.length, inputs.length - 1)]) {
          inputs[Math.min(pasted.length, inputs.length - 1)].focus();
        }
      }
    });
  });

  if (initialCode && initialCode.length >= 4) {
    initialCode.split("").forEach((c, i) => {
      if (inputs[i]) inputs[i].value = c;
    });
  }

  const getCode = () => inputs.map((i) => i.value).join("");

  const handleFinish = async () => {
    const code = getCode();
    if (!code || code.length < 4) {
      showError("Please enter the 6-digit OTP code.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Verifying...";
    clearError();

    try {
      const verifyRes = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, otp: code })
      });
      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.success) {
        modalContainer.remove();
        resolve(verifyData.accessToken);
      } else {
        showError(verifyData.message || "Invalid OTP verification code.");
        submitBtn.disabled = false;
        submitBtn.innerText = "Verify & Sign In →";
      }
    } catch (err) {
      showError(err.message || "Verification request failed.");
      submitBtn.disabled = false;
      submitBtn.innerText = "Verify & Sign In →";
    }
  };

  resendBtn.addEventListener("click", async () => {
    resendBtn.innerText = "Sending...";
    resendBtn.disabled = true;
    clearError();
    try {
      await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier })
      });
      resendBtn.innerText = "Sent ✓";
      setTimeout(() => {
        resendBtn.innerText = "Resend Email OTP";
        resendBtn.disabled = false;
      }, 30000);
    } catch (err) {
      resendBtn.innerText = "Resend Email OTP";
      resendBtn.disabled = false;
      showError("Failed to resend OTP. Please try again.");
    }
  });

  submitBtn.addEventListener("click", handleFinish);
  cancelBtn.addEventListener("click", () => {
    modalContainer.remove();
    reject(new Error("OTP verification cancelled."));
  });

  setTimeout(() => inputs[0].focus(), 100);
}
