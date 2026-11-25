import toast from "react-hot-toast";


export const showSuccess = (res) => {
  const message = res?.data?.message;
  if (message) toast.success(message);
};

export const showError = (err) => {
  const message = err?.response?.data?.message;

  if (message) {
    toast.error(message);
  }
};