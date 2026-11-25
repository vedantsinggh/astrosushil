import toast from "react-hot-toast";

export const extractErrorMessage = (err, fallback = "Something went wrong") => {
  const errorData = err?.response?.data;
  if (typeof errorData === "string") return errorData;
  const msg =
    errorData?.error?.message ||
    errorData?.message ||
    (typeof errorData?.error === "string" ? errorData.error : null) ||
    err?.message ||
    fallback;
  return typeof msg === "string" ? msg : fallback;
};

export const showSuccess = (res) => {
  const message = res?.data?.message;
  if (message) toast.success(message);
};

export const showError = (err) => {
  const message = extractErrorMessage(err, "");
  if (message) {
    toast.error(message);
  }
};