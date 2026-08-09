import { FormRegistrar } from './Registrar'
import { EntradasHoje } from './EntradasHoje'
import { AgendaDia } from './AgendaDia'

export { FormRegistrar, EntradasHoje, AgendaDia }

export default function Recepcionista({ pagina, onRegistrado }) {
  if (pagina === 'agenda') return <AgendaDia />
  if (pagina === 'visitantes') return <EntradasHoje />
  return <FormRegistrar onRegistrado={onRegistrado} />
}
