var libs = {
    thymeleaf: require('/lib/xp/thymeleaf'),
    content: require('/lib/xp/content'),
    portal: require('/lib/xp/portal'),
    httpClient: require('/lib/xp/http-client')
};

exports.get = handleGet;

function handleGet(req) {



    var uid = req.params.uid;

    var contentId = req.params.contentId;
    if (!contentId) {
        contentId = libs.portal.getContent()._id;
    }

    var content = libs.content.get({key: contentId});
    var site = libs.content.getSite({key: contentId});
    var siteConfig = libs.content.getSiteConfig({key: contentId, applicationKey: app.name});
    var apiKey = siteConfig.apiKey;
    var pageUrl = siteConfig.siteDomain + libs.portal.pageUrl({id: contentId, type: 'server'});


    var pageId = '';
    var pageUrl = siteConfig.siteDomain;

    if (content.type.indexOf(":site") == -1 && !!site) {
        pageId = content._path.replace(site._path, "");
        //pageUrl += libs.portal.url({path: pageId});
        pageUrl += pageId;
    }

    //log.info('UTIL log %s', JSON.stringify(site, null, 4));
    log.info('UTIL log %s', JSON.stringify(content, null, 4));

    //log.info(content._path);


    //var pageUrl = libs.portal.url({path: '/portal/master' + content._path, type: 'absolute'});


    log.info(pageUrl);


    //log.info(pageUrl);
    //log.info(content);

    var view = resolve('pagespeed.html');
    var model = createModel(req);

    function createModel(req) {
        var model = {};

        model.errors = [];
        model.pageUrl = pageUrl;



        try {

            model.devices = [
                {
                    title: 'Desktop',
                    data: getPageSpeed('desktop')
                },
                {
                    title: 'Mobile',
                    data: getPageSpeed('mobile')
                }
            ];
        }
        catch(err) {
            model.errors.push(err);
        }

        model.errorExists = model.errors.length > 0;

        if (model.errorExists) {
            log.debug(model.errors);
        }

        return model;
    }

    function getPageSpeed(strategy) {

        var result = {};
        var pageSpeedUrl = encodeURI('https://www.googleapis.com/pagespeedonline/v2/runPagespeed?url=' + pageUrl + '&strategy=' + strategy + '&key=' + apiKey);

        var json = getJSON(pageSpeedUrl);

        if (json.ruleGroups.SPEED) {
            result.speed = {
                score: json.ruleGroups.SPEED.score,
                grade: json.ruleGroups.SPEED.score < 60 ? 'error' : json.ruleGroups.SPEED.score < 80 ? 'warning' : 'ok'
            };
        }

        if (json.ruleGroups.USABILITY) {
            result.usability = {
                score: json.ruleGroups.USABILITY.score,
                grade: json.ruleGroups.USABILITY.score < 60 ? 'error' : json.ruleGroups.USABILITY.score < 80 ? 'warning' : 'ok'
            };
        }

        result.warnings = getWarnings(json.formattedResults.ruleResults);

        return result;
    }

    function getWarnings(ruleResults) {
        var warnings = {
            speed: [],
            usability: []
        };

        for (var key in ruleResults) {
            if (ruleResults.hasOwnProperty(key)) {
                var feature = ruleResults[key];

                if (feature.ruleImpact > 0) {
                    var warning = {
                        title: feature.localizedRuleName,
                        ruleImpact: feature.ruleImpact
                    };

                    if (feature.groups.indexOf('SPEED') > -1) {
                        warnings.speed.push(warning);
                    }
                    if (feature.groups.indexOf('USABILITY') > -1) {
                        warnings.usability.push(warning);
                    }
                }
            }
        }

        warnings.speed.sort(compareRuleImpact);
        warnings.usability.sort(compareRuleImpact);

        return warnings;
    }

    function getJSON(url) {
        var response = libs.httpClient.request({
            url: url,
            method: 'GET',
            connectionTimeout: 5000,
            readTimeout: 5000,
            contentType: 'application/json'
        });

        if (response.status !== 200) {
            throw 'Could not retrieve JSON url (' + response.status + ')';
        }
        return JSON.parse(response.body);
    }

    function compareRuleImpact(a,b) {
        if (a.ruleImpact > b.ruleImpact)
            return -1;
        if (a.ruleImpact < b.ruleImpact)
            return 1;
        return 0;
    }

    return {
        body: libs.thymeleaf.render(view, model)
    };
}