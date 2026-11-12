/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Centralized map linking Database Models to their corresponding Local JSON 
 * cache files. Controls cache routing and skip logic globally.
 * 
 * 2. HIERARCHY & PRIORITY:
 * 1. The generator automatically injects new entities into this map.
 * 2. skipMemoryCache flag overrides read/write attempts in controllers.
 * ============================================================================
 */

const TABLE_VIEW_FOLDER_MAP = {

    // ----> A
    "AirportMaster": {
        view_name: "v_airport_master",
        folder_name: "airport_master",
        json_file_name: "airport_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "AuditTrail": {
        view_name: "v_t_audit_trail",
        folder_name: "audit_trail",
        json_file_name: "audit_trail.json5",
        skipMemoryCache: true,
        conditions: {}
    },

    // ----> B
    "BranchMaster": {
        view_name: "v_branch_master",
        folder_name: "branch_master",
        json_file_name: "branch_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },

    // ----> C
    "ChatMaster": {
        view_name: "vw_chat_master",
        folder_name: "chat_master",
        json_file_name: "chat_master.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ChatMembers": {
        view_name: "vw_chat_participants",
        folder_name: "chat_members",
        json_file_name: "chat_members.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "CityMaster": {
        view_name: "v_city_master",
        folder_name: "city_master",
        json_file_name: "city_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "ConsigneeMaster": {
        view_name: "v_consignee_master",
        folder_name: "consignee_master",
        json_file_name: "consignee_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "CountryMaster": {
        view_name: "v_country_master",
        folder_name: "country_master",
        json_file_name: "country_master.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "CurrencyMaster": {
        view_name: "v_currency_master",
        folder_name: "currency_master",
        json_file_name: "currency_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "CustomerMaster": {
        view_name: "v_customer_master",
        folder_name: "customer_master",
        json_file_name: "customer_master.json5",
        skipMemoryCache: true,
        conditions: {}
    },

    // ----> D
    "DepartmentMaster": {
        view_name: "v_department_master",
        folder_name: "department_master",
        json_file_name: "department_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "DocumentTypeMaster": {
        view_name: "v_document_type_master",
        folder_name: "document_type_master",
        json_file_name: "document_type_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },

    // ----> E
    "EventMaster": {
        view_name: "v_event_master",
        folder_name: "event_master",
        json_file_name: "event_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "EventStatusMaster": {
        view_name: "v_event_status_master",
        folder_name: "event_status_master",
        json_file_name: "event_status_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },

    // ----> G
    "GroupRolePagePermission": {
        view_name: "v_group_role_page_permission",
        folder_name: "group_role_page_permission",
        json_file_name: "group_role_page_permission.json5",
        skipMemoryCache: false,
        conditions: {}
    },

    // ----> I
    "IncotermMaster": {
        view_name: "v_incoterm_master",
        folder_name: "incoterm_master",
        json_file_name: "incoterm_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "InvoiceDetails": {
        view_name: "v_invoice_details",
        folder_name: "invoice_details",
        json_file_name: "invoice_details.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "InvoiceFreightDetails": {
        view_name: "v_invoice_freight_details",
        folder_name: "invoice_freight_details",
        json_file_name: "invoice_freight_details.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "InvoiceMaster": {
        view_name: "v_invoice_master",
        folder_name: "invoice_master",
        json_file_name: "invoice_master.json5",
        skipMemoryCache: true,
        conditions: {}
    },

    // ----> L
    "LocationMaster": {
        view_name: "v_location_master",
        folder_name: "location_master",
        json_file_name: "location_master.json5",
        skipMemoryCache: true,
        conditions: {}
    },

    // ----> M
    "MenuMaster": {
        view_name: "v_menu_master",
        folder_name: "menu_master",
        json_file_name: "menu_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "MovementByMaster": {
        view_name: "v_movement_by_master",
        folder_name: "movement_by_master",
        json_file_name: "movement_by_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },

    // ----> N
    "NoteMaster": {
        view_name: "v_note_master",
        folder_name: "note_master",
        json_file_name: "note_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "NotificationMaster": {
        view_name: "vw_user_notifications",
        folder_name: "notification_master",
        json_file_name: "notification_master.json5",
        skipMemoryCache: true,
        conditions: {}
    },

    // ----> P
    "PackagingMaster": {
        view_name: "v_packaging_master",
        folder_name: "packaging_master",
        json_file_name: "packaging_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "Page": {
        view_name: "v_page",
        folder_name: "page",
        json_file_name: "page.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "PagePermission": {
        view_name: "v_page_permission",
        folder_name: "page_permission",
        json_file_name: "page_permission.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "Permission": {
        view_name: "v_permission",
        folder_name: "permission",
        json_file_name: "permission.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "PortMaster": {
        view_name: "v_port_master",
        folder_name: "port_master",
        json_file_name: "port_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "ProductMaster": {
        view_name: "v_product_master",
        folder_name: "product_master",
        json_file_name: "product_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },

    // ----> Q
    "QuatationAdditionalCharges": {
        view_name: "v_quatation_additional_charges",
        folder_name: "quatation_additional_charges",
        json_file_name: "quatation_additional_charges.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "QuatationApproval": {
        view_name: "v_quotation_approval",
        folder_name: "quotation_approval",
        json_file_name: "quotation_approval.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "QuatationConsignee": {
        view_name: "v_quatation_consignee",
        folder_name: "quatation_consignee",
        json_file_name: "quatation_consignee.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "QuatationHeader": {
        view_name: "v_quotation_header",
        folder_name: "quotation_header",
        json_file_name: "quotation_header.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "QuatationInvoiceItems": {
        view_name: "v_quotation_invoice_items",
        folder_name: "quotation_invoice_items",
        json_file_name: "quotation_invoice_items.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "QuatationShipper": {
        view_name: "v_quatation_shipper",
        folder_name: "quatation_shipper",
        json_file_name: "quatation_shipper.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "QuatationTransportCharges": {
        view_name: "v_quatation_transport_charges",
        folder_name: "quatation_transport_charges",
        json_file_name: "quatation_transport_charges.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "QuotationApproval": {
        view_name: "v_quotation_approval",
        folder_name: "quotation_approval",
        json_file_name: "quotation_approval.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "QuotationHeader": {
        view_name: "v_quotation_header",
        folder_name: "quotation_header",
        json_file_name: "quotation_header.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "QuotationInvoiceItems": {
        view_name: "v_quotation_invoice_items",
        folder_name: "quotation_invoice_items",
        json_file_name: "quotation_invoice_items.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "QuotationWeightDimention": {
        view_name: "v_quotation_weight_dimention",
        folder_name: "quotation_weight_dimention",
        json_file_name: "quotation_weight_dimention.json5",
        skipMemoryCache: true,
        conditions: {}
    },

    // ----> R
    "RoleMaster": {
        view_name: "v_role_master",
        folder_name: "role_master",
        json_file_name: "role_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },

    // ----> S
    "SacMaster": {
        view_name: "v_sac_master",
        folder_name: "sac_master",
        json_file_name: "sac_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "SalesPersonMaster": {
        view_name: "v_sales_person_master",
        folder_name: "sales_person_master",
        json_file_name: "sales_person_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "SchemaMaster": {
        view_name: "v_schema_master",
        folder_name: "schema_master",
        json_file_name: "schema_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "ServiceMaster": {
        view_name: "v_service_master",
        folder_name: "service_master",
        json_file_name: "service_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "Shipment": {
        view_name: "v_shipment_header",
        folder_name: "shipment",
        json_file_name: "shipment.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentBooking": {
        view_name: "v_shipment_booking",
        folder_name: "shipment_booking",
        json_file_name: "shipment_booking.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentBookingFlight": {
        view_name: "v_shipment_booking_flight",
        folder_name: "shipment_booking_flight",
        json_file_name: "shipment_booking_flight.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentClosure": {
        view_name: "v_shipment_closure",
        folder_name: "shipment_closure",
        json_file_name: "shipment_closure.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentClosureAdditionalCharges": {
        view_name: "v_shipment_closure_additional_charges",
        folder_name: "shipment_closure_additional_charges",
        json_file_name: "shipment_closure_additional_charges.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentClosureCharges": {
        view_name: "v_shipment_closure_charges",
        folder_name: "shipment_closure_charges",
        json_file_name: "shipment_closure_charges.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentClosureLogger": {
        view_name: "v_shipment_closure_logger",
        folder_name: "shipment_closure_logger",
        json_file_name: "shipment_closure_logger.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentConsignee": {
        view_name: "v_shipment_consignee",
        folder_name: "shipment_consignee",
        json_file_name: "shipment_consignee.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentDocument": {
        view_name: "v_shipment_document",
        folder_name: "shipment_document",
        json_file_name: "shipment_document.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentHeader": {
        view_name: "v_shipment_header",
        folder_name: "shipment_header",
        json_file_name: "shipment_header.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentInvoiceItems": {
        view_name: "v_shipment_invoice_items",
        folder_name: "shipment_invoice_items",
        json_file_name: "shipment_invoice_items.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentModeMaster": {
        view_name: "v_shipment_mode_master",
        folder_name: "shipment_mode_master",
        json_file_name: "shipment_mode_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "ShipmentPickup": {
        view_name: "v_shipment_pickup",
        folder_name: "shipment_pickup",
        json_file_name: "shipment_pickup.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentPod": {
        view_name: "v_shipment_pod",
        folder_name: "shipment_pod",
        json_file_name: "shipment_pod.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentRecovery": {
        view_name: "v_shipment_recovery",
        folder_name: "shipment_recovery",
        json_file_name: "shipment_recovery.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentShipper": {
        view_name: "v_shipment_shipper",
        folder_name: "shipment_shipper",
        json_file_name: "shipment_shipper.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentTracking": {
        view_name: "v_shipment_tracking",
        folder_name: "shipment_tracking",
        json_file_name: "shipment_tracking.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipmentTypeMaster": {
        view_name: "v_shipment_type_master",
        folder_name: "shipment_type_master",
        json_file_name: "shipment_type_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "ShipmentWeightDimention": {
        view_name: "v_shipment_weight_dimention",
        folder_name: "shipment_weight_dimention",
        json_file_name: "shipment_weight_dimention.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "ShipperMaster": {
        view_name: "v_shipper_master",
        folder_name: "shipper_master",
        json_file_name: "shipper_master.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "StaffMaster": {
        view_name: "v_staff_master",
        folder_name: "staff_master",
        json_file_name: "staff_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "StateMaster": {
        view_name: "v_state_master",
        folder_name: "state_master",
        json_file_name: "state_master.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "StatusMaster": {
        view_name: "v_status_master",
        folder_name: "status_master",
        json_file_name: "status_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },

    // ----> T
    "TemperatureMaster": {
        view_name: "v_temperature_master",
        folder_name: "temperature_master",
        json_file_name: "temperature_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },

    // ----> U
    "UnitMaster": {
        view_name: "v_unit_master",
        folder_name: "unit_master",
        json_file_name: "unit_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
    "UserMaster": {
        view_name: "v_user_master",
        folder_name: "user_master",
        json_file_name: "user_master.json5",
        skipMemoryCache: true,
        conditions: {}
    },

    // ----> V
    "VendorBillDetails": {
        view_name: "v_vendor_bill_details",
        folder_name: "vendor_bill_details",
        json_file_name: "vendor_bill_details.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "VendorBillHeader": {
        view_name: "v_vendor_bill_header",
        folder_name: "vendor_bill_header",
        json_file_name: "vendor_bill_header.json5",
        skipMemoryCache: true,
        conditions: {}
    },
    "VendorMaster": {
        view_name: "v_vendor_master",
        folder_name: "vendor_master",
        json_file_name: "vendor_master.json5",
        skipMemoryCache: false,
        conditions: {}
    },
} as const;
export default TABLE_VIEW_FOLDER_MAP;