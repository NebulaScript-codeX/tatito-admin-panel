from django.contrib import admin

from .models import (
    PharmacyBatch,
    PharmacyBrand,
    PharmacyCategory,
    PharmacyCouponUse,
    PharmacyDeliveryAssignment,
    PharmacyInventoryAdjustment,
    PharmacyOrder,
    PharmacyOrderBatchAllocation,
    PharmacyOrderLine,
    PharmacyProduct,
    PharmacyRefund,
)


for model in (
    PharmacyCategory,
    PharmacyBrand,
    PharmacyProduct,
    PharmacyBatch,
    PharmacyInventoryAdjustment,
    PharmacyOrder,
    PharmacyOrderLine,
    PharmacyOrderBatchAllocation,
    PharmacyCouponUse,
    PharmacyDeliveryAssignment,
    PharmacyRefund,
):
    admin.site.register(model)
