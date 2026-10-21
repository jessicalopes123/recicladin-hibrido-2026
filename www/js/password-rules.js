export function getPasswordRuleStates(password) {
  return {
    length: [...password].length >= 8,
    uppercase: /\p{Lu}/u.test(password),
    lowercase: /\p{Ll}/u.test(password),
    number: /\d/.test(password),
    special: /[^\p{L}\p{N}]/u.test(password)
  };
}

export function isPasswordValid(password) {
  return Object.values(getPasswordRuleStates(password)).every(Boolean);
}

export function bindPasswordRequirements(input, requirements) {
  if (!input || !requirements) return;

  const update = () => {
    const states = getPasswordRuleStates(input.value);
    requirements.querySelectorAll('[data-password-rule]').forEach(item => {
      item.classList.toggle('is-met', states[item.dataset.passwordRule]);
    });
  };

  input.addEventListener('input', update);
  update();
}
