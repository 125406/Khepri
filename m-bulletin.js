$(function () {
    let queryBid = returnQuerystringValue("bid");

    $.ajax({
        type: "POST",
        url: "bulletin?handler=BulletinDetail",
        data: { Bid: queryBid },
        beforeSend: function (xhr) {
            xhr.setRequestHeader("X-CSRF-TOKEN", $('input:hidden[name="__RequestVerificationToken"]').val());
        },
        cache: false,
        success: function (d) {
            codeNotEquals1(d);

            $(".mBulletin-header-date").text(d.data.myDataSet.table.startDate.replace(/\//g, "."));
            $(".mBulletin-header-cate").text(returnCateName(d.data.myDataSet.table.bullentinCatId).name).addClass(returnCateName(d.data.myDataSet.table.bullentinCatId).className);
            $(".mBulletin-header-title").text(d.data.myDataSet.table.title);
            $(".mBulletin-content").append(d.data.myDataSet.table.content);
        },
        error: function (x) {
            mAjaxFailed(x, "公告內容");
        },
    });
});

//async function track(type, obj) {
//    if (type == 1) {
//        await sender.passEvent(
//            new webTrackingSDK.events.PageViewEvent({
//                eventId: "4100",
//                event: "gtw_events_page_view",
//                pageInfo: { page: "mstw_202606_crown_campain" },
//            }),
//        );
//    } else {
//        await sender.passEvent(
//            new webTrackingSDK.events.ClickEvent({
//                eventId: "4100",
//                event: "gtw_events_item_click",
//                pageInfo: { page: "mstw_202606_crown_campain" },
//                clickInfo: obj,
//            }),
//        );
//    }
//}

//track(1, {});

//$("body").on("click", "#topBarNav a:eq(0)", async function (e) {
//    await track(2, {
//        sec: "header",
//        name: "back_to_officaial",
//    });
//    e.preventDefault();
//    setTimeout(() => {
//        location.href = e.currentTarget.href;
//    }, 100);
//});
//$("body").on("click", "#topBarNav a:eq(1)", async function (e) {
//    await track(2, {
//        sec: "header",
//        name: "fanclub",
//    });
//});
//$("body").on("click", "#topBarNav a:eq(2)", async function (e) {
//    await track(2, {
//        sec: "header",
//        name: "download",
//    });
//});
//$("body").on("click", "#topBarNav a:eq(3)", async function (e) {
//    await track(2, {
//        sec: "header",
//        name: "regist",
//    });
//});
//$("body").on("click", "#gameId_CS a", async function (e) {
//    await track(2, {
//        sec: "header",
//        name: "maple",
//    });

//    e.preventDefault();
//    setTimeout(() => {
//        location.href = e.currentTarget.href;
//    }, 100);
//});
//$("body").on("click", "#gameIcon a", async function (e) {
//    await track(2, {
//        sec: "header",
//        name: "logo",
//    });
//    e.preventDefault();
//    setTimeout(() => {
//        location.href = e.currentTarget.href;
//    }, 100);
//});
