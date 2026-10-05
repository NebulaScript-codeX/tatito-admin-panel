from django.urls import path

from .views import (
    CommerceInvoicesView,
    CommerceOrderDetailView,
    CommerceOrdersView,
    CommercePlanCancelView,
    CommercePlanCatalogView,
    CommerceRefundActionView,
    CommerceRefundsView,
    CommerceRevenueView,
    CommerceSourceTransactionStatusView,
    CommerceTransactionStatusView,
    CommerceTransactionsView,
    CommerceWalletHistoryView,
    CommerceWalletsView,
)

urlpatterns = [
    path("orders/", CommerceOrdersView.as_view(), name="commerce-orders"),
    path("orders/<str:order_type>/<str:order_id>/", CommerceOrderDetailView.as_view(), name="commerce-order-detail"),
    path("orders/plan/<str:order_id>/cancel/", CommercePlanCancelView.as_view(), name="commerce-plan-cancel"),
    path("transactions/", CommerceTransactionsView.as_view(), name="commerce-transactions"),
    path("transactions/source/<str:source>/<str:transaction_id>/<str:target>/", CommerceSourceTransactionStatusView.as_view(), name="commerce-source-transaction-status"),
    path("transactions/<str:transaction_id>/<str:target>/", CommerceTransactionStatusView.as_view(), name="commerce-transaction-status"),
    path("revenue/", CommerceRevenueView.as_view(), name="commerce-revenue"),
    path("refunds/", CommerceRefundsView.as_view(), name="commerce-refunds"),
    path("refunds/<str:source>/<str:refund_id>/<str:action>/", CommerceRefundActionView.as_view(), name="commerce-refund-action"),
    path("invoices/", CommerceInvoicesView.as_view(), name="commerce-invoices"),
    path("wallets/", CommerceWalletsView.as_view(), name="commerce-wallets"),
    path("wallets/<str:user_id>/adjust/", CommerceWalletsView.as_view(), name="commerce-wallet-adjust"),
    path("wallets/<str:user_id>/transactions/", CommerceWalletHistoryView.as_view(), name="commerce-wallet-history"),
    path("plans/", CommercePlanCatalogView.as_view(), name="commerce-plan-catalog"),
]
