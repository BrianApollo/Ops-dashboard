import { Routes, Route } from "react-router-dom";
import { OpsLayout } from "../domains/ops/layout/OpsLayout";
import { ProductsPage } from "../domains/ops/products/ProductsPage";
import { CampaignLaunchPage } from "../domains/ops/campaigns/launch/CampaignLaunchPage";
import { CampaignViewPage } from "../domains/ops/campaigns/post-launch/CampaignViewPage";
import { InfrastructurePage } from "../domains/ops/infrastructure/InfrastructurePage";
import { EditorPortalPage } from "../pages/videos/EditorPortalPage";
import LoginPage from "../domains/auth/LoginPage";
import { RequireAuth, RedirectIfAuthenticated, RootRedirect } from "../core/auth/AuthGuard";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RedirectIfAuthenticated />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/" element={<RootRedirect />} />

        <Route element={<OpsLayout />}>
          <Route path="/ops" element={<ProductsPage />} />
          <Route path="/ops/products" element={<ProductsPage />} />
          <Route path="/ops/products/:id" element={<ProductsPage />} />
          <Route path="/ops/products/:id/campaigns/:campaignId" element={<CampaignViewPage />} />
          <Route path="/ops/products/:id/campaigns/:campaignId/launch" element={<CampaignLaunchPage />} />
          <Route path="/ops/infrastructure" element={<InfrastructurePage />} />
          <Route path="/videos" element={<EditorPortalPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
