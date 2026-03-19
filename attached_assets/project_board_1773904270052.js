frappe.pages['project-board'].on_page_load = function(wrapper) {

frappe.require("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js");

var page = frappe.ui.make_app_page({
parent: wrapper,
title: "Project Dashboard",
single_column: true
});

/* FILTERS */

var project = page.add_field({label:"Project",fieldtype:"Link",options:"Project"});
var remarks = page.add_field({label:"Project Remarks",fieldtype:"Link",options:"MR Remarks"});

remarks.get_query = function(){
return {filters:{project:project.get_value()}};
};

var pending_only = page.add_field({label:"Pending Only",fieldtype:"Check"});
var po_pending_only = page.add_field({label:"PO Not Created",fieldtype:"Check"});
var due_only = page.add_field({label:"Due",fieldtype:"Check"});

page.add_button("Load", load_data);
page.add_button("Export Excel", export_excel);

/* LAYOUT */

$(page.body).append(
'<div class="dashboard-root">'+
'<div id="summary_cards"></div>'+
'<div class="dashboard-table-wrapper">'+
'<table class="dashboard-table" id="dashboard_table">'+
'<thead><tr>'+
'<th>S.No</th>'+
'<th>Description<br><input class="desc-filter"></th>'+
'<th>MR Qty</th>'+
'<th>Store Qty</th>'+
'<th>Production Qty</th>'+
'<th>Not Req Qty</th>'+
'<th>Buy Required</th>'+
'<th>PO Qty</th>'+
'<th>Received Qty</th>'+
'<th>PO Pending</th>'+
'<th>PR Pending</th>'+
'<th>Delivery From</th>'+
'<th>Delivery To</th>'+
'<th>Aging</th>'+
'<th style="width:120px;">MR No</th>'+
'<th style="width:120px;">PO No</th>'+
'</tr></thead>'+
'<tbody id="dashboard_body"></tbody>'+
'</table></div></div>'
);

/* STYLE */

$("<style>").text(
'.dashboard-root{margin-top:40px;}'+
'#summary_cards{display:flex;gap:12px;margin-bottom:15px;}'+
'.card{background:#f6f7fb;padding:10px 18px;border-radius:8px;font-weight:600;}'+
'.dashboard-table-wrapper{height:65vh;overflow:auto;border:1px solid #ddd;}'+
'.dashboard-table{width:100%;border-collapse:collapse;font-size:12px;}'+
'.dashboard-table th{position:sticky;top:0;background:#f2f4f8;}'+
'.dashboard-table td{border:1px solid #eee;padding:6px;}'+
'.qty{text-align:right;}'+
'.pending-red{color:#dc3545;font-weight:600;}'+
'.pending-green{color:#28a745;}'+
'.pr-red{color:#dc3545;font-weight:600;}'+
'.child-row{background:#fafafa;}'+
'.child-desc{padding-left:20px;font-style:italic;}'+
'.scroll-cell{max-height:60px;overflow-y:auto;}'+
'.link{color:#1a73e8;text-decoration:none;}'+
'.link:hover{text-decoration:underline;}'
).appendTo("head");

/* UTIL */

function format_date(val){
if(!val) return "—";
var p=val.split("-");
return p[2]+"/"+p[1]+"/"+p[0];
}

function make_links(val,doctype){
if(!val) return "";
return val.split("||").map(function(v){
return '<div><a class="link" href="/app/'+doctype+'/'+v+'" target="_blank">'+v+'</a></div>';
}).join("");
}

var full_data=[];

/* LOAD */

function load_data(){
frappe.call({
method:"wtt_module.wtt_module.page.project_board.project_board.get_project_dashboard",
args:{project:project.get_value(),mr_remarks:remarks.get_value()},
callback:function(r){
full_data=r.message||[];
render_table();
}
});
}

/* RENDER */

function render_table(){


var data=[].concat(full_data);

/* CHECKBOX FILTERS */

if(pending_only.get_value()){
    data=data.filter(function(d){ return d.po_pending>0; });
}

if(po_pending_only.get_value()){
    data=data.filter(function(d){ return !d.po_no; });
}

if(due_only.get_value()){
    data=data.filter(function(d){ return (d.aging||"").indexOf("pending")>-1; });
}

var rows="";
var pending=0,completed=0,po_pending=0,due=0;

for(var i=0;i<data.length;i++){

    var d=data[i];

    if(d.po_pending>0) pending++; else completed++;
    if(!d.po_no) po_pending++;
    if((d.aging||"").indexOf("pending")>-1) due++;

    var pending_class=d.po_pending>0?"pending-red":"pending-green";
    var pr_class=d.pr_pending>0?"pr-red":"";

    rows+='<tr class="parent-row" data-i="'+i+'">';
    rows+='<td>'+(i+1)+'</td>';
    rows+='<td class="desc-cell" style="cursor:pointer;">▶ '+(d.description||"")+'</td>';

    rows+='<td class="qty">'+d.mr_qty.toFixed(2)+'</td>';
    rows+='<td class="qty">'+d.store_qty.toFixed(2)+'</td>';
    rows+='<td class="qty">'+d.production_qty.toFixed(2)+'</td>';
    rows+='<td class="qty">'+d.not_req_qty.toFixed(2)+'</td>';
    rows+='<td class="qty">'+d.buy_required.toFixed(2)+'</td>';

    rows+='<td class="qty">'+d.po_qty.toFixed(2)+'</td>';
    rows+='<td class="qty">'+d.received_qty.toFixed(2)+'</td>';

    rows+='<td class="qty '+pending_class+'">'+d.po_pending.toFixed(2)+'</td>';
    rows+='<td class="qty '+pr_class+'">'+d.pr_pending.toFixed(2)+'</td>';

    rows+='<td>'+format_date(d.delivery_from)+'</td>';
    rows+='<td>'+format_date(d.delivery_to)+'</td>';

    rows+='<td>'+(d.aging||"")+'</td>';

    rows+='<td><div class="scroll-cell">'+make_links(d.mr_no,"material-request")+'</div></td>';
    rows+='<td><div class="scroll-cell">'+make_links(d.po_no,"purchase-order")+'</div></td>';

    rows+='</tr>';

    rows+='<tr class="child-row child-'+i+'" style="display:none;">'+
          '<td></td><td colspan="15"><input type="text" class="child-search" data-i="'+i+'" placeholder="Search technical..." style="width:200px;"></td></tr>';

    var children=d.child_rows||[];

    for(var j=0;j<children.length;j++){

        var c=children[j];

        rows+='<tr class="child-row child-'+i+'" style="display:none;">';

        rows+='<td></td>';
        rows+='<td class="child-desc">'+(c.technical_description||"")+'</td>';

        rows+='<td class="qty">'+c.mr_qty.toFixed(2)+'</td>';
        rows+='<td class="qty">'+c.store_qty.toFixed(2)+'</td>';
        rows+='<td class="qty">'+c.production_qty.toFixed(2)+'</td>';
        rows+='<td class="qty">'+c.not_req_qty.toFixed(2)+'</td>';
        rows+='<td class="qty">'+c.buy_required.toFixed(2)+'</td>';

        rows+='<td class="qty">'+c.po_qty.toFixed(2)+'</td>';
        rows+='<td class="qty">'+c.received_qty.toFixed(2)+'</td>';

        rows+='<td class="qty">'+c.po_pending.toFixed(2)+'</td>';
        rows+='<td class="qty">'+c.pr_pending.toFixed(2)+'</td>';

        rows+='<td>'+format_date(c.delivery_from)+'</td>';
        rows+='<td>'+format_date(c.delivery_to)+'</td>';

        rows+='<td>'+(c.aging||"")+'</td>';

        rows+='<td><div class="scroll-cell">'+make_links(c.mr_no,"material-request")+'</div></td>';
        rows+='<td><div class="scroll-cell">'+make_links(c.po_no,"purchase-order")+'</div></td>';

        rows+='</tr>';
    }
}

$("#dashboard_body").html(rows);

/* TOGGLE */

$(".parent-row").off("click").on("click",function(){
    var i=$(this).data("i");
    $(".child-"+i).toggle();
});

/* DESCRIPTION FILTER ONLY */

$(".desc-filter").off("keyup").on("keyup",function(){

    var val=$(this).val().toLowerCase();

    $(".parent-row").each(function(){

        var txt=$(this).find(".desc-cell").text().toLowerCase();
        var match=txt.indexOf(val)>-1;

        $(this).toggle(match);

        var i=$(this).data("i");
        if(!match) $(".child-"+i).hide();

    });

});

/* DRILL SEARCH (ONLY TECH DESC) */

$(document).off("keyup",".child-search").on("keyup",".child-search",function(){

    var i=$(this).data("i");
    var val=$(this).val().toLowerCase();

    $(".child-"+i).each(function(){

        var txt=$(this).find(".child-desc").text().toLowerCase();

        if(txt){
            $(this).toggle(txt.indexOf(val)>-1);
        }

    });

});

$("#summary_cards").html(
    '<div class="card">Total : '+data.length+'</div>'+
    '<div class="card">Pending : '+pending+'</div>'+
    '<div class="card">Completed : '+completed+'</div>'+
    '<div class="card">PO Not Created : '+po_pending+'</div>'+
    '<div class="card">Due : '+due+'</div>'
);


}

/* EXPORT */

function export_excel(){
var table=document.getElementById("dashboard_table");
if(!table){
frappe.msgprint("No data");
return;
}
var wb=XLSX.utils.table_to_book(table);
XLSX.writeFile(wb,"Project_Dashboard.xlsx");
}

/* EVENTS */

pending_only.$input.on("change",render_table);
po_pending_only.$input.on("change",render_table);
due_only.$input.on("change",render_table);

}
