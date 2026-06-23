import type { SVGProps } from 'react'

function AzureIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M5.4 3.5h6.9l-5.7 7.9 3.4 4.6H2.7L5.4 3.5zm8.1 0h7.8L12.3 20.5 9.9 15.9l3.6-12.4z" />
    </svg>
  )
}

export function AzureLoginButton({
  disabled,
  loading,
  onClick,
}: {
  disabled?: boolean
  loading?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-[#0078D4]/30 bg-[#0078D4] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#106ebe] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <AzureIcon className="size-5" />
      {loading ? 'Redirecting to Azure…' : 'Continue with Azure'}
    </button>
  )
}
