// Chèn một đoạn transformation của Cloudinary vào secure_url đã lưu trong DB.
// VD: cldUrl('https://res.cloudinary.com/demo/image/upload/v123/abc.jpg', 'w_300,h_300,c_fill,q_auto,f_auto')
// -> 'https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_fill,q_auto,f_auto/v123/abc.jpg'
export function cldUrl(url, transform) {
  if (!url) return url;
  if (!url.includes('/upload/')) return url; // không phải URL Cloudinary -> trả về nguyên bản
  return url.replace('/upload/', `/upload/${transform}/`);
}
