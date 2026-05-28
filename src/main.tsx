import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App availableFields={[
      { key: "nome", label: "Nome do Cliente" },
      { key: "cpf", label: "CPF/CNPJ" },
      { key: "endereco", label: "Endereço Completo" },
      { key: "data_nascimento", label: "Data de Nascimento" }
    ]} />
  </StrictMode>
)
