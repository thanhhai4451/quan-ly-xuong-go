export const getDrivePreview = (url) => {
  if (!url) return "";

  let fileId = null;

  if (url.includes("/file/d/")) {
    fileId = url.split("/file/d/")[1]?.split("/")[0];
  } else if (url.includes("open?id=")) {
    fileId = url.split("open?id=")[1]?.split("&")[0];
  } else if (url.includes("uc?id=")) {
    fileId = url.split("uc?id=")[1]?.split("&")[0];
  }

  if (!fileId) return "";

  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
};