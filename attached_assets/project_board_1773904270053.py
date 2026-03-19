# import frappe
# from collections import defaultdict
# import re
# from datetime import date


# @frappe.whitelist()
# def get_project_dashboard(project=None, mr_remarks=None):

#     conditions = ["mr.workflow_state='Approved'"]
#     values = []

#     if project:
#         conditions.append("mr.project=%s")
#         values.append(project)

#     if mr_remarks:
#         conditions.append("mr.custom_project_remarks=%s")
#         values.append(mr_remarks)

#     condition_sql = " AND ".join(conditions)

#     # MR
#     mr_data = frappe.db.sql(f"""
#         SELECT
#             mri.name mri_name,
#             mr.name mr_no,
#             mri.description,
#             mri.qty,
#             mri.technical_description
#         FROM `tabMaterial Request Item` mri
#         JOIN `tabMaterial Request` mr
#         ON mr.name=mri.parent
#         WHERE {condition_sql}
#     """, tuple(values), as_dict=True)

#     # STORE
#     store_map = {x.material_request_item: x.store_qty for x in frappe.db.sql("""
#         SELECT material_request_item, SUM(qty) store_qty
#         FROM `tabStore Order Table`
#         GROUP BY material_request_item
#     """, as_dict=True)}

#     # PRODUCTION
#     prod_map = {x.material_request_item: x.production_qty for x in frappe.db.sql("""
#         SELECT material_request_item, SUM(qty) production_qty
#         FROM `tabProduction Order Table`
#         GROUP BY material_request_item
#     """, as_dict=True)}

#     # PR
#     pr_map = {x.material_request_item: x.received_qty for x in frappe.db.sql("""
#         SELECT material_request_item, SUM(qty) received_qty
#         FROM `tabPurchase Receipt Item`
#         GROUP BY material_request_item
#     """, as_dict=True)}

#     # PO FULL DETAILS
#     po_data = frappe.db.sql("""
#         SELECT
#             poi.material_request_item,
#             poi.qty,
#             po.name po_no,
#             po.delivery_from,
#             po.delivery_to
#         FROM `tabPurchase Order Item` poi
#         JOIN `tabPurchase Order` po ON po.name=poi.parent
#         WHERE po.workflow_state NOT IN ('Rejected','Cancelled')
#     """, as_dict=True)

#     po_map = defaultdict(list)
#     for p in po_data:
#         po_map[p.material_request_item].append(p)

#     def clean_desc(desc):
#         return re.sub(r"\s+"," ",(desc or "").strip()).lower()

#     grouped = defaultdict(lambda: {
#         "description":"",
#         "mr_qty":0,
#         "store_qty":0,
#         "production_qty":0,
#         "not_req_qty":0,
#         "po_qty":0,
#         "received_qty":0,
#         "mr_nos":set(),
#         "po_nos":set(),
#         "delivery_from":None,
#         "delivery_to":None,
#         "child_rows":[]
#     })

#     today = date.today()

#     for r in mr_data:

#         key = clean_desc(r.description)
#         g = grouped[key]

#         if not g["description"]:
#             g["description"] = r.description.strip()

#         store = store_map.get(r.mri_name,0)
#         prod = prod_map.get(r.mri_name,0)
#         received = pr_map.get(r.mri_name,0)

#         po_list = po_map.get(r.mri_name,[])
#         po_qty = sum(p.qty for p in po_list)

#         delivery_from = max([p.delivery_from for p in po_list if p.delivery_from], default=None)
#         delivery_to = max([p.delivery_to for p in po_list if p.delivery_to], default=None)

#         buy_required = max(r.qty-store-prod,0)
#         po_pending = max(buy_required-po_qty,0)
#         pr_pending = max(po_qty-received,0)

#         # AGING
#         aging=""
#         if po_qty >= received and delivery_to:
#             diff=(delivery_to-today).days
#             aging = f"{abs(diff)} days pending" if diff<0 else f"{diff} days to receive"

#         # PARENT AGG
#         g["mr_qty"] += r.qty
#         g["store_qty"] += store
#         g["production_qty"] += prod
#         g["po_qty"] += po_qty
#         g["received_qty"] += received

#         if delivery_from:
#             if not g["delivery_from"] or delivery_from > g["delivery_from"]:
#                 g["delivery_from"] = delivery_from

#         if delivery_to:
#             if not g["delivery_to"] or delivery_to > g["delivery_to"]:
#                 g["delivery_to"] = delivery_to

#         g["mr_nos"].add(r.mr_no)

#         for p in po_list:
#             g["po_nos"].add(p.po_no)

#         # CHILD ROW (FULL DATA)
#         g["child_rows"].append({
#             "technical_description": r.technical_description or "",
#             "mr_qty": r.qty,
#             "store_qty": store,
#             "production_qty": prod,
#             "not_req_qty": 0,
#             "buy_required": buy_required,
#             "po_qty": po_qty,
#             "received_qty": received,
#             "po_pending": po_pending,
#             "pr_pending": pr_pending,
#             "delivery_from": delivery_from,
#             "delivery_to": delivery_to,
#             "aging": aging,
#             "mr_no": r.mr_no,
#             "po_no": "||".join([p.po_no for p in po_list])
#         })

#     final = []

#     for g in grouped.values():

#         buy_required = max(g["mr_qty"]-g["store_qty"]-g["production_qty"],0)
#         po_pending = max(buy_required-g["po_qty"],0)
#         pr_pending = max(g["po_qty"]-g["received_qty"],0)

#         aging=""
#         if g["delivery_to"]:
#             diff=(g["delivery_to"]-today).days
#             aging = f"{abs(diff)} days pending" if diff<0 else f"{diff} days to receive"

#         final.append({
#             "description": g["description"],
#             "mr_qty": g["mr_qty"],
#             "store_qty": g["store_qty"],
#             "production_qty": g["production_qty"],
#             "not_req_qty": g["not_req_qty"],
#             "buy_required": buy_required,
#             "po_qty": g["po_qty"],
#             "received_qty": g["received_qty"],
#             "po_pending": po_pending,
#             "pr_pending": pr_pending,
#             "delivery_from": g["delivery_from"],
#             "delivery_to": g["delivery_to"],
#             "aging": aging,
#             "mr_no": "||".join(g["mr_nos"]),
#             "po_no": "||".join(g["po_nos"]),
#             "child_rows": g["child_rows"]
#         })

#     return final

import frappe
from collections import defaultdict
import re
from datetime import date


@frappe.whitelist()
def get_project_dashboard(project=None, mr_remarks=None):

    conditions = ["mr.workflow_state='Approved'"]
    values = []

    if project:
        conditions.append("mr.project=%s")
        values.append(project)

    if mr_remarks:
        conditions.append("mr.custom_project_remarks=%s")
        values.append(mr_remarks)

    condition_sql = " AND ".join(conditions)

    # MR DATA
    mr_data = frappe.db.sql(f"""
        SELECT
            mri.name AS mri_name,
            mr.name AS mr_no,
            mri.description,
            mri.qty,
            mri.technical_description
        FROM `tabMaterial Request Item` mri
        JOIN `tabMaterial Request` mr
        ON mr.name = mri.parent
        WHERE {condition_sql}
    """, tuple(values), as_dict=True)

    # STORE
    store_map = {x.material_request_item: x.store_qty for x in frappe.db.sql("""
        SELECT material_request_item, SUM(qty) AS store_qty
        FROM `tabStore Order Table`
        GROUP BY material_request_item
    """, as_dict=True)}

    # PRODUCTION
    prod_map = {x.material_request_item: x.production_qty for x in frappe.db.sql("""
        SELECT material_request_item, SUM(qty) AS production_qty
        FROM `tabProduction Order Table`
        GROUP BY material_request_item
    """, as_dict=True)}

    # PURCHASE RECEIPT
    pr_map = {x.material_request_item: x.received_qty for x in frappe.db.sql("""
        SELECT material_request_item, SUM(qty) AS received_qty
        FROM `tabPurchase Receipt Item`
        GROUP BY material_request_item
    """, as_dict=True)}

    # NOT REQUIRED (FIXED ✅)
    not_req_map = {x.mr_ref: x.not_req_qty for x in frappe.db.sql("""
        SELECT 
            mr_ref,
            SUM(not_req_qty) AS not_req_qty
        FROM `tabNot Required Items Table`
        WHERE docstatus = 1
        GROUP BY mr_ref
    """, as_dict=True)}

    # PO DATA
    po_data = frappe.db.sql("""
        SELECT
            poi.material_request_item,
            poi.qty,
            po.name AS po_no,
            po.delivery_from,
            po.delivery_to
        FROM `tabPurchase Order Item` poi
        JOIN `tabPurchase Order` po ON po.name = poi.parent
        WHERE po.workflow_state NOT IN ('Rejected','Cancelled')
    """, as_dict=True)

    po_map = defaultdict(list)
    for p in po_data:
        po_map[p.material_request_item].append(p)

    def clean_desc(desc):
        return re.sub(r"\s+", " ", (desc or "").strip()).lower()

    grouped = defaultdict(lambda: {
        "description": "",
        "mr_qty": 0,
        "store_qty": 0,
        "production_qty": 0,
        "not_req_qty": 0,
        "po_qty": 0,
        "received_qty": 0,
        "mr_nos": set(),
        "po_nos": set(),
        "delivery_from": None,
        "delivery_to": None,
        "child_rows": []
    })

    today = date.today()

    for r in mr_data:

        key = clean_desc(r.description)
        g = grouped[key]

        if not g["description"]:
            g["description"] = r.description.strip()

        store = store_map.get(r.mri_name, 0)
        prod = prod_map.get(r.mri_name, 0)
        received = pr_map.get(r.mri_name, 0)
        not_req = not_req_map.get(r.mri_name, 0)

        po_list = po_map.get(r.mri_name, [])
        po_qty = sum(p.qty for p in po_list)

        delivery_from = max([p.delivery_from for p in po_list if p.delivery_from], default=None)
        delivery_to = max([p.delivery_to for p in po_list if p.delivery_to], default=None)

        # ✅ UPDATED CALCULATION
        buy_required = max(r.qty - store - prod - not_req, 0)
        po_pending = max(buy_required - po_qty, 0)
        pr_pending = max(po_qty - received, 0)

        # AGING
        aging = ""
        if po_qty >= received and delivery_to:
            diff = (delivery_to - today).days
            aging = f"{abs(diff)} days pending" if diff < 0 else f"{diff} days to receive"

        # PARENT AGGREGATION
        g["mr_qty"] += r.qty
        g["store_qty"] += store
        g["production_qty"] += prod
        g["not_req_qty"] += not_req
        g["po_qty"] += po_qty
        g["received_qty"] += received

        if delivery_from:
            if not g["delivery_from"] or delivery_from > g["delivery_from"]:
                g["delivery_from"] = delivery_from

        if delivery_to:
            if not g["delivery_to"] or delivery_to > g["delivery_to"]:
                g["delivery_to"] = delivery_to

        g["mr_nos"].add(r.mr_no)

        for p in po_list:
            g["po_nos"].add(p.po_no)

        # CHILD ROW
        g["child_rows"].append({
            "technical_description": r.technical_description or "",
            "mr_qty": r.qty,
            "store_qty": store,
            "production_qty": prod,
            "not_req_qty": not_req,
            "buy_required": buy_required,
            "po_qty": po_qty,
            "received_qty": received,
            "po_pending": po_pending,
            "pr_pending": pr_pending,
            "delivery_from": delivery_from,
            "delivery_to": delivery_to,
            "aging": aging,
            "mr_no": r.mr_no,
            "po_no": "||".join([p.po_no for p in po_list])
        })

    final = []

    for g in grouped.values():

        # ✅ FINAL CALCULATION FIX
        buy_required = max(
            g["mr_qty"] - g["store_qty"] - g["production_qty"] - g["not_req_qty"],
            0
        )

        po_pending = max(buy_required - g["po_qty"], 0)
        pr_pending = max(g["po_qty"] - g["received_qty"], 0)

        aging = ""
        if g["delivery_to"]:
            diff = (g["delivery_to"] - today).days
            aging = f"{abs(diff)} days pending" if diff < 0 else f"{diff} days to receive"

        final.append({
            "description": g["description"],
            "mr_qty": g["mr_qty"],
            "store_qty": g["store_qty"],
            "production_qty": g["production_qty"],
            "not_req_qty": g["not_req_qty"],  # ✅ INCLUDED
            "buy_required": buy_required,
            "po_qty": g["po_qty"],
            "received_qty": g["received_qty"],
            "po_pending": po_pending,
            "pr_pending": pr_pending,
            "delivery_from": g["delivery_from"],
            "delivery_to": g["delivery_to"],
            "aging": aging,
            "mr_no": "||".join(g["mr_nos"]),
            "po_no": "||".join(g["po_nos"]),
            "child_rows": g["child_rows"]
        })

    return final