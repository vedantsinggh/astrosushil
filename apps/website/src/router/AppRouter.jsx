import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";

import AppToaster from "../components/layout/AppToaster";
import MainLayout from "../components/layout/MainLayout";
import AuthLayout from "../components/layout/AuthLayout";
import PublicRoute from "./PublicRoute";
import ProtectedRoute from "./ProtectedRoute";
import ScrollToTop from "../hooks/ScrollToTop";
import Loader from "../components/layout/Loader";
import Home from "../pages/Home/Home";
import { useAuthStore } from "../store/useAuthStore";

// Lazy Pages (Home is eager — it is the entry point)
const BlogDetail = lazy(() => import("../pages/Blogs/BlogDetail"));
const SignUpPage = lazy(() => import("../pages/auth/Signup"));
const LoginPage = lazy(() => import("../pages/auth/Login"));
const AboutUs = lazy(() => import("../pages/Aboutus/AboutUs"));
const CoursesPage = lazy(() => import("../pages/Course/CoursesList"));
const CartPage = lazy(() => import("../pages/Cart/CartPage"));
const Productslist = lazy(() => import("../pages/Products/Productslist"));
const CategoryListing = lazy(() => import("../pages/Products/CategoryListing"));
const ProductDetailPage = lazy(
  () => import("../pages/Products/Productdetailpage"),
);
const BlogsList = lazy(() => import("../pages/Blogs/BlogsList"));
const TermsConditions = lazy(() => import("../pages/CMS/Termsconditions"));
const PrivacyPolicy = lazy(() => import("../pages/CMS/Privacypolicy"));
const ContactUs = lazy(() => import("../pages/CMS/Contactus"));
const NotFound = lazy(() => import("../components/Notfound"));
const ConsultationSection = lazy(
  () => import("../pages/Consultation/Consultationsection"),
);
const UserDashboard = lazy(() => import("../pages/Profile/Userdashboard"));
const OrderSuccessPage = lazy(() => import("../components/Ordersuccesspage"));
const OrderDetailPage = lazy(() => import("../pages/Profile/OrderDetailPage"));
const CheckoutPage2 = lazy(() => import("../pages/checkout/CheckoutPage2"));
const KundliPage = lazy(() => import("../pages/Kundli/KundliPage"));
const KundliMatch = lazy(() => import("../pages/Kundli/MathKundli"));
const ShippingDeliveryPolicy = lazy(
  () => import("../pages/CMS/ShippingDeliveryPolicy"),
);
const ServicesGrid = lazy(() => import("../pages/Services/ServiceList"));
const KundliReport = lazy(() => import("../pages/Kundli/Kundlireport"));
const Coursedetails = lazy(() => import("../pages/Course/Coursedetails"));
const Shop = lazy(() => import("../pages/Products/Shop"));
const CancellationRefundPolicy = lazy(
  () => import("../pages/CMS/CancellationRefundPolicy"),
);
const Bookappointment = lazy(
  () => import("../pages/Consultation/Bookappointment"),
);
const ReportsSection = lazy(() => import("../pages/Reports/Reportssection"));
const MatchReportPage = lazy(() => import("../pages/Kundli/Matchreportpage"));

// Previously eager — now lazy since none are on the critical path
const HoroscopePDF = lazy(() => import("../pages/Reports/Horoscopepdf"));
const BookingForm = lazy(() => import("../pages/Reports/BookingForm"));
const KundliMatchReport = lazy(
  () => import("../pages/Reports/Kundlimatchreport"),
);
const ReportsDetails = lazy(() => import("../pages/Reports/ReportsDetails"));
const ThankYouPage = lazy(() => import("@/components/ThankYouPage"));

function DashboardRoute() {
  const token = useAuthStore((s) => s.token);

  return token ? <UserDashboard /> : <LoginPage />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />

      <Suspense fallback={<Loader />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/courses/" element={<CoursesPage />} />
            <Route path="/course" element={<Navigate to="/courses/" replace />} />
            <Route path="/courses/:slug" element={<Coursedetails />} />
            <Route path="/services/" element={<ServicesGrid />} />
            <Route path="/free-online-kundli" element={<KundliPage />} />
            <Route path="/kundli/report/" element={<KundliReport />} />
            <Route path="/kundli-matching/" element={<KundliMatch />} />
            <Route path="/kundli-match/report/" element={<MatchReportPage />} />
            <Route
              path="/online-consultations/"
              element={<ConsultationSection />}
            />
            <Route
              path="/online-consultations/booking-successful"
              element={<ThankYouPage type="consultation" />}
            />
            <Route path="/product" element={<Navigate to="/products/" replace />} />
            <Route path="/products/" element={<Productslist />} />
            <Route path="/products/:categorySlug" element={<CategoryListing />} />
            <Route path="/shop/" element={<Shop />} />
            <Route path="/product/:slug" element={<ProductDetailPage />} />
            <Route
              path="/thank-you"
              element={<ThankYouPage type="product" />}
            />
            <Route path="/blog/" element={<BlogsList />} />
            <Route path="/terms-conditions/" element={<TermsConditions />} />
            <Route path="/privacy-policy/" element={<PrivacyPolicy />} />
            <Route
              path="/shipping-delivery-policy/"
              element={<ShippingDeliveryPolicy />}
            />
            <Route
              path="/cancellation-refund-policy/"
              element={<CancellationRefundPolicy />}
            />
            <Route path="/contact-us/" element={<ContactUs />} />
            <Route
              path="/contact-us/thank-you"
              element={<ThankYouPage type="contact" />}
            />
            <Route path="/book-appointment/" element={<Bookappointment />} />
            <Route
              path="/personalized-astrology-reports"
              element={<ReportsSection />}
            />
            <Route
              path="/personalized-astrology-reports/:slug"
              element={<ReportsDetails />}
            />
            <Route path="/reports/daily" element={<HoroscopePDF />} />
            <Route path="/reports/match" element={<KundliMatchReport />} />
            <Route path="/report-order/:slug" element={<BookingForm />} />
            <Route
              path="/report/generated-successfully"
              element={<ThankYouPage type="report" />}
            />

            <Route path="/dashboard/" element={<DashboardRoute />} />

            <Route path="/:slug" element={<BlogDetail />} />
            <Route path="/*" element={<NotFound />} />

            <Route element={<PublicRoute />}>
              <Route element={<AuthLayout />}>
                <Route path="/register/" element={<SignUpPage />} />
              </Route>
            </Route>
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage2 />} />
              <Route
                path="/dashboard/orders/:orderId"
                element={<OrderDetailPage />}
              />
              <Route path="/order-success" element={<OrderSuccessPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>

      <AppToaster />
    </BrowserRouter>
  );
}
