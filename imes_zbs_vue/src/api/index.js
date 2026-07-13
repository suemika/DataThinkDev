import axios from 'axios'

const apiClient = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

export async function fetchDataFromAPI(funcNo, params) {
  const response = await apiClient.post('/imc/customOpt', {
    req: funcNo,
    data: JSON.stringify(params)
  })
  return response.data
}
