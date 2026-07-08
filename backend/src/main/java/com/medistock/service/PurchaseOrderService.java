package com.medistock.service;

import com.medistock.dto.PurchaseOrderDto;
import java.util.List;

public interface PurchaseOrderService {
    PurchaseOrderDto createPurchaseOrder(PurchaseOrderDto poDto, String creatorUsername);
    PurchaseOrderDto approvePurchaseOrder(Long id, String approverUsername);
    PurchaseOrderDto rejectPurchaseOrder(Long id, String approverUsername);
    PurchaseOrderDto receivePurchaseOrder(Long id, String receiverUsername);
    List<PurchaseOrderDto> getAllPurchaseOrders();
    PurchaseOrderDto getPurchaseOrderById(Long id);
}
