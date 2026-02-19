/**
 * ProductsPage - Main products workspace.
 * Composition only - no business logic.
 * Uses route param for product-scoped mode.
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { ToggleTabs } from '../../../ui';
import { useProductsController } from '../../../features/products';
import { useCampaignsController } from '../../../features/campaigns';
import { useScriptsController } from '../../../features/scripts';
import { useImagesController } from '../../../features/images';
import { useAdPresetsController, getPrimaryTexts, getHeadlines, getDescriptions } from '../../../features/ad-presets';
import { useVideosController } from '../../../features/videos/useVideosController';
import { updateVideo } from '../../../features/videos/data';
import { useAdvertorialsController } from '../../../features/advertorials';
import { StatusCard } from '../../../core/status';
import { ProductSelector } from './ProductSelector';
import { ProductCreationModal } from './ProductCreationModal';
import { CampaignsTab } from '../campaigns/pre-launch/CampaignsTab';
import { AddCampaignDialog } from '../campaigns/pre-launch/AddCampaignDialog';
import { ScriptsTab } from '../scripts/ScriptsTab';
import { VideosTab } from '../videos/VideosTab';
import { ImagesTab } from '../images/ImagesTab';
import { CreateImagesDialog } from '../images/CreateImagesDialog';
import { AdvertorialsTab } from './advertorials/AdvertorialsTab';
import { AddAdvertorialDialog } from './advertorials/AddAdvertorialDialog';
import { SetupTab } from '../setup/SetupTab';
import type { WorkspaceTab, ProductInfo } from './composition/types';

const GPT_INSTRUCTION = `In each image prompt, I want you to think of the best advertisements' wordings that's related to the image and put it in anywhere you think it's the best.
Also, you can add some appropriate elements and design enhancements that are aligned with advertorial.`;

const CLAUDE_INSTRUCTION = `When generating image prompts, act as a world-class direct response marketer and creative director.
Create powerful, scroll-stopping image concepts designed for maximum CTR and conversions.
Each image prompt must:
Include short, punchy, high-impact ad wording that naturally fits the scene.
Add tasteful advertorial-friendly design elements (arrows, highlights, text bubbles, UI hints, overlays, before/after frames, etc.).
Use authentic UGC or advertorial visual styles that feel real and believable.
Highlight the product subtly but clearly.
Emphasize benefits, transformations, curiosity, or emotional impact.
Ensure the overall image looks like engaging content first, advertisement second.
Provide a complete, structured prompt describing composition, scene, lighting, characters, styling, on-image text, and design enhancements.
Generate prompts that would outperform 99% of ads on Facebook, Instagram, and TikTok.`;
import { AddScriptDialog } from '../scripts/AddScriptDialog';

export function ProductsPage() {
  const { id: productIdParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('campaigns');

  // Controllers (data access only) - pass productId for filtering
  const productsController = useProductsController();
  const campaignsController = useCampaignsController({ initialProductId: productIdParam });
  const scriptsController = useScriptsController({ initialFilters: { productId: productIdParam ?? null, status: [], isApproved: null } });
  const imagesController = useImagesController({ initialFilters: { productId: productIdParam ?? null, status: [], imageType: null } });
  const adPresetsController = useAdPresetsController({ initialFilters: { productId: productIdParam ?? null, status: [] } });
  const videosController = useVideosController();
  const advertorialsController = useAdvertorialsController({ initialFilters: { productId: productIdParam ?? null } });

  // Product from route param only - transform to ProductInfo UI type
  const selectedProduct = useMemo((): ProductInfo | null => {
    if (!productIdParam) return null;
    const product = productsController.products.find((p) => p.id === productIdParam);
    if (!product) return null;
    return {
      id: product.id,
      name: product.name,
      status: product.status,
      driveFolderId: product.driveFolderId,
      images: product.images,
      logos: product.logos,
    };
  }, [productsController.products, productIdParam]);

  // Set ALL controller filters when route param changes
  // Note: controller methods excluded from deps to avoid infinite loop
  // (they're recreated each render due to useListController returning new object)
  useEffect(() => {
    const productId = productIdParam ?? null;
    videosController.handleProductChange(productId);
    imagesController.setProductFilter(productId);
    scriptsController.setProductFilter(productId);
    campaignsController.setProductFilter(productId);
    adPresetsController.setProductFilter(productId);
    advertorialsController.setProductFilter(productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdParam]);

  // Use controller's processed output (already filtered + sorted)
  const filteredCampaigns = campaignsController.filteredCampaigns;
  const filteredScripts = scriptsController.filteredScripts;
  const filteredImages = imagesController.filteredImages;
  const filteredPresets = adPresetsController.filteredAdPresets;
  const filteredVideos = videosController.list.filteredRecords;

  // Product name lookup
  const productNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    productsController.products.forEach((p) => { map[p.id] = p.name; });
    return map;
  }, [productsController.products]);

  // Transform to UI types (using entity IDs only)
  const campaignsData = useMemo(() => {
    return filteredCampaigns.map((c) => ({
      id: c.id,
      name: c.name,
      productId: c.product.id,
      productName: productNameMap[c.product.id] ?? 'Unknown',
      status: c.status,
      platform: c.platform,
      createdAt: c.createdAt,
      hasScripts: filteredScripts.some((s) => s.product.id === c.product.id && s.isApproved),
      hasVideos: filteredVideos.some((v) => v.product.id === c.product.id && v.status === 'available'),
      hasImages: filteredImages.some((i) => i.product.id === c.product.id && (i.status === 'available' || i.usedInCampaigns.length > 0)),
    }));
  }, [filteredCampaigns, filteredScripts, filteredVideos, filteredImages, productNameMap]);

  const scriptsData = useMemo(() => {
    return filteredScripts.map((s) => {
      const scriptVideos = filteredVideos.filter((v) => v.script.id === s.id);

      // Group video counts by editor name
      const editorCounts: Record<string, number> = {};
      scriptVideos.forEach((v) => {
        const editorName = v.editor.name;
        editorCounts[editorName] = (editorCounts[editorName] ?? 0) + 1;
      });
      const videosByEditor = Object.entries(editorCounts).map(([editorName, count]) => ({
        editorName,
        count,
      }));

      // Uploaded videos = status !== 'todo'
      const uploadedVideos = scriptVideos
        .filter((v) => v.status !== 'todo')
        .map((v) => ({
          id: v.id,
          name: v.name,
          status: v.status,
          format: v.format,
          driveUrl: v.creativeLink,
        }));

      return {
        id: s.id,
        name: s.name,
        productId: s.product.id,
        productName: productNameMap[s.product.id] ?? 'Unknown',
        authorId: s.author?.id,
        author: s.author?.name,
        content: s.content,
        status: s.status,
        isApproved: s.isApproved,
        videos: scriptVideos.map((v) => ({ id: v.id, name: v.name, status: v.status, format: v.format })),
        videosByEditor,
        uploadedVideos,
      };
    });
  }, [filteredScripts, filteredVideos, productNameMap]);

  const imagesData = useMemo(() => {
    return filteredImages.map((i) => ({
      id: i.id,
      name: i.name,
      productName: productNameMap[i.product.id] ?? 'Unknown',
      imageType: i.imageType,
      status: i.status,
      thumbnailUrl: i.thumbnailUrl,
      isUsed: i.usedInCampaigns.length > 0,
      driveFileId: i.driveFileId,
      width: i.width,
      height: i.height,
      fileSize: i.fileSize,
      notes: i.notes,
      usedInCampaigns: i.usedInCampaigns,
      createdAt: i.createdAt,
      image_url: i.image_url,
    }));
  }, [filteredImages, productNameMap]);

  const presetsData = useMemo(() => {
    return filteredPresets.map((p) => ({
      id: p.id,
      name: p.name,
      productName: p.product ? productNameMap[p.product.id] ?? 'Unknown' : 'Unknown',
      status: p.status,
      primaryTexts: getPrimaryTexts(p),
      headlines: getHeadlines(p),
      descriptions: getDescriptions(p),
      cta: p.callToAction ?? '',
      beneficiaryName: p.beneficiaryName ?? '',
      payerName: p.payerName ?? '',
    }));
  }, [filteredPresets, productNameMap]);

  // Calculate stats for header cards
  // ALWAYS use raw controller data, filtered locally by productIdParam only
  // This ensures stats are immune to tab switches, launcher filters, page navigation
  const stats = useMemo(() => {
    // Raw data from controllers (never use filtered*)
    const allScripts = scriptsController.scripts;
    const allVideos = videosController.list.allRecords;
    const allImages = imagesController.images;
    const allCampaigns = campaignsController.campaigns;

    // Filter locally by productId if selected
    const scripts = productIdParam
      ? allScripts.filter((s) => s.product.id === productIdParam)
      : allScripts;
    const videos = productIdParam
      ? allVideos.filter((v) => v.product.id === productIdParam)
      : allVideos;
    const images = productIdParam
      ? allImages.filter((i) => i.product.id === productIdParam)
      : allImages;
    const campaigns = productIdParam
      ? allCampaigns.filter((c) => c.product.id === productIdParam)
      : allCampaigns;

    // Calculate stats from locally filtered data
    const assignedScriptIds = new Set(
      videos.map((v) => v.script?.id).filter(Boolean)
    );

    return {
      unassignedScripts: scripts.filter((s) => !assignedScriptIds.has(s.id)).length,
      availableVideos: videos.filter((v) => v.status === 'available').length,
      availableImages: images.filter((i) => i.usedInCampaigns.length === 0).length,
      activeCampaigns: campaigns.filter((c) => c.status === 'Launched').length,
    };
  }, [
    productIdParam,
    scriptsController.scripts,
    videosController.list.allRecords,
    imagesController.images,
    campaignsController.campaigns,
  ]);

  // Handlers (using entity IDs only)
  const handleProductSelect = (productId: string | null) => {
    navigate(productId ? `/ops/products/${productId}` : '/ops/products');
  };

  const handleStatusChange = async (status: string) => {
    if (!productIdParam) return;
    try {
      await productsController.updateStatus(productIdParam, status as 'Active' | 'Preparing' | 'Benched');
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleBulkAssignScripts = async (scriptIds: string[], editorId?: string) => {
    const scripts = scriptIds
      .map(id => scriptsController.scripts.find(s => s.id === id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined)
      .map(s => ({ id: s.id, name: s.name, product: s.product }));

    if (scripts.length === 0) return;

    try {
      await videosController.bulkAssignScriptsToEditor(scripts, editorId);
    } catch (error) {
      console.error('Failed to assign scripts:', error);
    }
  };

  // Single-script assign reuses the bulk path
  const handleAssignScript = (scriptId: string, editorId?: string) => {
    handleBulkAssignScripts([scriptId], editorId);
  };

  // Video status/notes handlers
  const [isUpdatingVideo, setIsUpdatingVideo] = useState(false);

  // Product Creation Modal
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Tab action dialogs
  const [addCampaignDialogOpen, setAddCampaignDialogOpen] = useState(false);
  const [addScriptDialogOpen, setAddScriptDialogOpen] = useState(false);
  const [addAdvertorialDialogOpen, setAddAdvertorialDialogOpen] = useState(false);
  const [createImagesDialogOpen, setCreateImagesDialogOpen] = useState(false);
  const [isApprovingImages, setIsApprovingImages] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateImages = async (data: any) => {
    try {
      const payload = {
        ...data,
        image_count: data.numberOfImages, // Map numberOfImages to image_count
        image_size: data.imageSize,     // Map to snake_case
        output_format: data.outputFormat, // Map to snake_case
        product_id: selectedProduct?.id,
        image_url_1: selectedProduct?.images?.[0]?.url,
        gpt_instruction: GPT_INSTRUCTION,
        claude_instruction: CLAUDE_INSTRUCTION,
        destination_path: 'file-path'
      };

      // Remove the old keys if desired
      delete payload.numberOfImages;
      delete payload.imageSize;
      delete payload.outputFormat;

      console.log('Sending Create Images payload:', payload);

      const response = await fetch(import.meta.env.VITE_IMAGE_GENERATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('Image creation started successfully!');
        setCreateImagesDialogOpen(false);
      } else {
        console.error('Failed to start image creation:', response.statusText);
        alert('Failed to start image creation. Please check console for details.');
      }
    } catch (error) {
      console.error('Error creating images:', error);
      alert('An error occurred while creating images.');
    }
  };

  const handleVideoStatusChange = useCallback(async (videoId: string, status: 'todo' | 'available') => {
    setIsUpdatingVideo(true);
    try {
      await updateVideo(videoId, { status });
      await videosController.list.refetch();
    } finally {
      setIsUpdatingVideo(false);
    }
  }, [videosController.list]);

  const handleVideoNotesChange = useCallback(async (videoId: string, notes: string) => {
    await updateVideo(videoId, { notes });
    await videosController.list.refetch();
  }, [videosController.list]);

  // Image upload handler
  const handleImageFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedProduct?.driveFolderId) return;
    try {
      await imagesController.uploadImages(
        selectedProduct.id,
        selectedProduct.name,
        selectedProduct.driveFolderId,
        Array.from(files)
      );
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    // Reset input
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = '';
    }
  }, [selectedProduct, imagesController]);

  // Loading state
  const isLoading = productsController.isLoading || campaignsController.isLoading || scriptsController.isLoadingAuthors;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Approve Images Handler
  const handleApproveImages = async (ids: string[]) => {
    if (!confirm(`Are you sure you want to approve ${ids.length} images?`)) return;

    setIsApprovingImages(true);
    try {
      if (!selectedProduct) throw new Error('No product selected');

      // Call the controller's approveImages which now handles fetching from Cloudflare & uploading to Drive
      await imagesController.approveImages(
        ids,
        selectedProduct.id,
        selectedProduct.name,
        selectedProduct.driveFolderId!
      );

      alert(`Approved ${ids.length} images successfully!`);
      setSelectedImageIds(new Set());
    } catch (error) {
      console.error('Failed to approve images:', error);
      alert(`Failed to approve images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsApprovingImages(false);
    }
  };

  const showProductColumn = !productIdParam;

  return (
    <Box data-component="products-page" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 3,
        }}
      >
        <ProductSelector
          products={productsController.products}
          selectedProduct={selectedProduct}
          onSelect={handleProductSelect}
          onStatusChange={handleStatusChange}
          onCreateProduct={() => setIsCreatingProduct(true)}
        />
        <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
          <StatusCard label="Scripts" subtitle="Unassigned" count={stats.unassignedScripts} size="compact" />
          <StatusCard label="Videos" subtitle="Available" count={stats.availableVideos} size="compact" />
          <StatusCard label="Images" subtitle="Available" count={stats.availableImages} size="compact" />
          <StatusCard label="Campaigns" subtitle="Active" count={stats.activeCampaigns} size="compact" />
        </Box>
      </Box>

      {/* Tabs + Action Buttons */}
      <Paper
        component="section"
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          bgcolor: 'background.paper',
        }}
      >
        <ToggleTabs
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'campaigns', label: 'Campaigns' },
            { value: 'scripts', label: 'Scripts' },
            { value: 'videos', label: 'Videos' },
            { value: 'images', label: 'Images' },
            { value: 'advertorials', label: 'Advertorials' },
            { value: 'setup', label: 'Setup' },
          ]}
          size="medium"
        />

        {/* Action Buttons - conditional per tab */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeTab === 'campaigns' && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setAddCampaignDialogOpen(true)}
              disabled={!productIdParam}
              sx={{ textTransform: 'none' }}
            >
              Add Campaign
            </Button>
          )}
          {activeTab === 'scripts' && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setAddScriptDialogOpen(true)}
              disabled={!productIdParam}
              sx={{ textTransform: 'none' }}
            >
              Add Script
            </Button>
          )}
          {activeTab === 'images' && (
            <>
              <input
                ref={imageFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageFileSelect}
                style={{ display: 'none' }}
              />
              <Button
                variant="contained"
                size="small"
                startIcon={imagesController.isUploading ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
                onClick={() => imageFileInputRef.current?.click()}
                disabled={!productIdParam || imagesController.isUploading}
                sx={{ textTransform: 'none' }}
              >
                {imagesController.isUploading && imagesController.uploadProgress
                  ? `Uploading ${imagesController.uploadProgress.current}/${imagesController.uploadProgress.total}`
                  : 'Add Images'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AutoFixHighIcon />}
                onClick={() => setCreateImagesDialogOpen(true)}
                disabled={!productIdParam}
                sx={{ textTransform: 'none' }}
              >
                Create Images
              </Button>
            </>
          )}
          {activeTab === 'advertorials' && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setAddAdvertorialDialogOpen(true)}
              disabled={!productIdParam}
              sx={{ textTransform: 'none' }}
            >
              Add Advertorial
            </Button>
          )}
        </Box>
      </Paper>

      {/* Hidden file input for images */}

      {/* Tab Content */}
      <Box component="main">
        {activeTab === 'campaigns' && (
          <CampaignsTab
            campaigns={campaignsData}
          />
        )}
        {activeTab === 'scripts' && (
          <ScriptsTab
            scripts={scriptsData}
            videos={filteredVideos}
            showProductColumn={showProductColumn}
            onAssign={handleAssignScript}
            assigningScriptIds={videosController.assigningScriptIds}
            onBulkAssign={handleBulkAssignScripts}
            editors={videosController.editorOptions.filter((e): e is { value: string; label: string } => e.value !== null)}
            onVideoStatusChange={handleVideoStatusChange}
            onVideoNotesChange={handleVideoNotesChange}
            isUpdatingVideo={isUpdatingVideo}
            onScriptContentChange={scriptsController.updateContent}
            onCreateHooks={scriptsController.createHookVariants}
            isCreatingHooks={scriptsController.isCreatingHooks}
            getHooksForScript={scriptsController.getHooksForScript}
            extractScriptNumber={scriptsController.extractScriptNumber}
            onRequestScrollstoppers={videosController.requestScrollstoppers}
            selectedProductId={productIdParam ?? null}
            selectedProductName={selectedProduct?.name ?? null}
            authorOptions={scriptsController.authorOptions}
            getNextScriptNumber={scriptsController.getNextScriptNumber}
          />
        )}
        {activeTab === 'videos' && (
          <VideosTab
            videos={filteredVideos}
            showProductColumn={showProductColumn}
            onStatusChange={handleVideoStatusChange}
            onNotesChange={handleVideoNotesChange}
            isUpdating={isUpdatingVideo}
            onUpload={productIdParam ? videosController.uploadCreative : undefined}
            canUploadToVideo={productIdParam ? videosController.canUploadToVideo : undefined}
          />
        )}
        {activeTab === 'images' && (
          <ImagesTab
            images={imagesData}
            showProductColumn={showProductColumn}
            onApprove={handleApproveImages}
            isApproving={isApprovingImages}
            selectedIds={selectedImageIds}
            onSelectionChange={setSelectedImageIds}
          />
        )}
        {activeTab === 'advertorials' && (
          <AdvertorialsTab
            controller={advertorialsController.list}
            onApprove={advertorialsController.approveAdvertorial}
            onUpdate={advertorialsController.updateAdvertorial}
          />
        )}
        {activeTab === 'setup' && (
          <SetupTab
            presets={presetsData}
            showProductColumn={showProductColumn}
            selectedProduct={selectedProduct}
            onSave={adPresetsController.savePreset}
            onCreatePreset={adPresetsController.createPreset}
            onDuplicatePreset={adPresetsController.duplicatePreset}
            onUploadAsset={productsController.uploadProductAsset}
            onDeleteAsset={productsController.deleteProductAsset}
            isSaving={adPresetsController.isSaving}
            isCreating={adPresetsController.isCreating}
            isUploading={productsController.isUploading}
            isDeleting={productsController.isDeleting}
            uploadProgress={productsController.uploadProgress}
          />
        )}
      </Box>
      <ProductCreationModal
        open={isCreatingProduct}
        onClose={() => setIsCreatingProduct(false)}
        onSubmit={productsController.createProduct}
        isCreating={productsController.isCreating}
      />

      {/* Add Campaign Dialog */}
      {productIdParam && selectedProduct && (
        <AddCampaignDialog
          open={addCampaignDialogOpen}
          onClose={() => setAddCampaignDialogOpen(false)}
          onSubmit={async (name) => {
            await campaignsController.createCampaign(name, productIdParam);
            setAddCampaignDialogOpen(false);
          }}
          isSubmitting={campaignsController.isCreating}
          productName={selectedProduct.name}
          productId={productIdParam}
        />
      )}

      {/* Add Script Dialog */}
      {productIdParam && selectedProduct && (
        <AddScriptDialog
          open={addScriptDialogOpen}
          onClose={() => setAddScriptDialogOpen(false)}
          onSubmit={scriptsController.createNewScript}
          onSubmitWithHooks={scriptsController.createScriptWithHooks}
          isSubmitting={scriptsController.isCreating}
          productId={productIdParam}
          productName={selectedProduct.name}
          authorOptions={scriptsController.authorOptions}
          nextScriptNumber={scriptsController.getNextScriptNumber(productIdParam)}
        />
      )}

      {/* Add Advertorial Dialog */}
      {productIdParam && selectedProduct && (
        <AddAdvertorialDialog
          open={addAdvertorialDialogOpen}
          onClose={() => setAddAdvertorialDialogOpen(false)}
          onSubmit={async (name, productId, text, link) => {
            await advertorialsController.createAdvertorial(name, productId, text, link);
            setAddAdvertorialDialogOpen(false);
          }}
          isSubmitting={advertorialsController.isLoading}
          productName={selectedProduct.name}
          productId={productIdParam}
        />
      )}

      {/* Create Images Dialog */}
      <CreateImagesDialog
        open={createImagesDialogOpen}
        onClose={() => setCreateImagesDialogOpen(false)}
        onSubmit={handleCreateImages}
        advertorials={advertorialsController.advertorials}
      />
    </Box>
  );
}
