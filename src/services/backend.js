import api from "./api";

export const unwrap = (response) => response.data?.data ?? response.data;

export const getData = async (url) => unwrap(await api.get(url));

export const postData = async (url, payload) => unwrap(await api.post(url, payload));

export const putData = async (url, payload) => unwrap(await api.put(url, payload));

export const deleteData = async (url) => unwrap(await api.delete(url));
