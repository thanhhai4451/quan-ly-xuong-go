# Quản Lý Xưởng Gỗ

## Chạy ứng dụng

Chạy `npm install` để cài các phụ thuộc, sau đó dùng `npm start` để chạy ở chế độ phát triển hoặc `npm run build` để tạo bản production trong thư mục `build`.

## PWA và thông báo đẩy

Ứng dụng có manifest cài đặt, service worker Firebase Cloud Messaging và nút **Bật thông báo** trong thanh tiêu đề. Firebase Console cần bật Cloud Messaging và có Web Push certificates (VAPID).

1. Khóa VAPID public hiện được cấu hình làm giá trị mặc định trong frontend để workflow GitHub Actions có thể build ứng dụng. Có thể ghi đè bằng `REACT_APP_FIREBASE_VAPID_KEY` trong `.env.local` khi phát triển; sao chép `.env.example` thành `.env.local` nếu cần tùy chỉnh.
2. Cấp quyền thông báo trên HTTPS (hoặc `localhost`); trên iOS cần iOS 16.4 trở lên và thêm ứng dụng vào Màn hình chính trước khi bật Web Push.
3. Khi người dùng cho phép, token được lưu tại `fcmTokens/{uid}/{tokenKey}` trong Realtime Database. Cấu hình Database Rules để chỉ người dùng đã đăng nhập đọc/ghi nhánh UID của chính mình, ví dụ:

```json
{
  "rules": {
    "fcmTokens": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

4. Các thông báo sự kiện được gửi tự động bởi Cloud Functions trong `functions/index.js`: tạo đơn mới gửi tới mọi thiết bị đã đăng ký; khi Tổ Phôi bàn giao cho Tổ Định Hình thì gửi tới các tài khoản trong tổ; khi đơn đóng gói đủ và chuyển sang chờ giao thì gửi tới mọi thiết bị đã đăng ký. Tài khoản tổ Định Hình được xác định bằng email Firebase Authentication được cấu hình trong hàm. Để triển khai Cloud Functions, dự án Firebase cần bật billing plan Blaze; sau khi push mã lên `main`, workflow deploy sẽ triển khai cả Hosting và Functions. Tài khoản đã bật thông báo trước đây vẫn nhận đơn mới/chờ giao, nhưng cần bấm **Bật thông báo** lại nếu thiết bị chưa đăng ký hoặc cần cập nhật token.

Nếu đổi Firebase project, cập nhật cấu hình đồng bộ trong `src/firebase.js` và `public/firebase-messaging-sw.js`. Web Push không được cung cấp trên mọi trình duyệt/nền tảng. Frontend kiểm tra hỗ trợ trước khi lấy token và hiển thị lỗi nếu VAPID, quyền thông báo hoặc cấu hình Firebase chưa sẵn sàng.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
