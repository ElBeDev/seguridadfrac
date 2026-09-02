import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

// Los mensajes de éxito llegan con prefijo "✓ " (marcador interno que
// nunca se pinta): aquí se convierte en icono SVG; sin prefijo se asume
// aviso/error y lleva icono de exclamación.
export function ToastMsg({ texto }: { texto: string }) {
  const ok = texto.startsWith('✓');
  return (
    <>
      {ok ? <FaCheckCircle /> : <FaExclamationCircle />}
      <span>{ok ? texto.slice(1).trim() : texto}</span>
    </>
  );
}
