interface Props {
  message: string
}

export default function StatusMessage({ message }: Props) {
  if (!message) {
    return null
  }

  return <div class="alert alert-info">{message}</div>
}
