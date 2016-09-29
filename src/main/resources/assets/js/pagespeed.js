$(function() {
    $('.pagespeed__button--warnings').on('click', function() {
        $(this).siblings('.pagespeed__warning-list').slideToggle();
    });
});