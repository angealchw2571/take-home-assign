import axios from "axios"
// TODO: change this to the correct base URL
const baseURL = import.meta.env.VITE_BACKEND_URL
const api = axios.create({
	baseURL: baseURL,
	timeout: 100000,
})

export default api
