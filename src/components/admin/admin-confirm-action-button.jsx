"use client";

export function AdminConfirmActionButton({
  children,
  className = "",
  confirmMessage,
  formAction,
  type = "submit",
}) {
  return (
    <button
      type={type}
      formAction={formAction}
      className={className}
      onClick={(event) => {
        if (!confirmMessage) return;
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {children}
    </button>
  );
}
