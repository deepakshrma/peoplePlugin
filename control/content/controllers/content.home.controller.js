'use strict';

(function (angular, buildfire) {
    angular
        .module('peoplePluginContent')
        .controller('ContentHomeCtrl', ['$scope', '$modal', 'Buildfire', '$csv', 'SORT', 'TAG_NAMES', 'ERROR_CODE', 'RankOfLastItem', '$timeout', 'Location', '$sce', 'PeopleInfo', '$rootScope',
            function ($scope, $modal, Buildfire, FormatConverter, SORT, TAG_NAMES, ERROR_CODE, RankOfLastItem, $timeout, Location, $sce, PeopleInfo, $rootScope) {
                /**
                 * List of options available for sorting people list.
                 * */
                var header = {
                    topImage: "Image URL",
                    fName: "First Name",
                    lName: "Last Name",
                    position: "Position",
                    bodyContent: "Information"
                };

                /**
                 * SearchOptions are using for searching , sorting people and fetching people list
                 * @type object
                 */

                    //Scroll current view to top when page loaded.
                buildfire.navigation.scrollTop();

                function isValidItem(item, index, array) {
                    return item.fName || item.lName;
                }

                function validateCsv(items) {
                    if (!Array.isArray(items) || !items.length) {
                        return false;
                    }
                    return items.every(isValidItem);
                }

                var initialLoad = false;
                var ContentHome = this;
                ContentHome.searchOptions = {
                    filter: {"$json.fName": {"$regex": '/*'}},
                    skip: SORT._skip,
                    limit: SORT._limit + 1 // the plus one is to check if there are any more
                };

                /**
                 * ContentHome.busy used to enable/disable infiniteScroll. if busy true it means there is not more data.
                 * @type {boolean}
                 */
                ContentHome.busy = false;


                /**
                 * ContentHome.items used to store the people list which fetched from server.
                 * @type {null}
                 */
                ContentHome.items = null;

                /**
                 * ContentHome.data used to store PeopleInfo which fetched from server.
                 * @type {null}
                 */
                ContentHome.data = null;

                /**
                 * ContentHome.sortingOptions are used to show options in Sort Items drop-down menu in home.html.
                 * @type {*[]}
                 */
                ContentHome.sortingOptions = [
                    SORT.MANUALLY,
                    SORT.OLDEST_TO_NEWEST,
                    SORT.NEWEST_TO_OLDEST,
                    SORT.FIRST_NAME_A_TO_Z,
                    SORT.FIRST_NAME_Z_TO_A,
                    SORT.LAST_NAME_A_TO_Z,
                    SORT.LAST_NAME_Z_TO_A
                ];


                // create a new instance of the buildfire carousel editor
                var editor = new Buildfire.components.carousel.editor("#carousel");
                // this method will be called when a new item added to the list
                editor.onAddItems = function (items) {
                    if (!ContentHome.data.content.images)
                        ContentHome.data.content.images = [];
                    ContentHome.data.content.images.push.apply(ContentHome.data.content.images, items);
                    $scope.$digest();
                };
                // this method will be called when an item deleted from the list
                editor.onDeleteItem = function (item, index) {
                    ContentHome.data.content.images.splice(index, 1);
                    $scope.$digest();
                };
                // this method will be called when you edit item details
                editor.onItemChange = function (item, index) {
                    ContentHome.data.content.images.splice(index, 1, item);
                    $scope.$digest();
                };
                // this method will be called when you change the order of items
                editor.onOrderChange = function (item, oldIndex, newIndex) {
                    var items = ContentHome.data.content.images;

                    var tmp = items[oldIndex];

                    if (oldIndex < newIndex) {
                        for (var i = oldIndex + 1; i <= newIndex; i++) {
                            items[i - 1] = items[i];
                        }
                    } else {
                        for (var i = oldIndex - 1; i >= newIndex; i--) {
                            items[i + 1] = items[i];
                        }
                    }
                    items[newIndex] = tmp;

                    ContentHome.data.content.images = items;
                    $scope.$digest();
                };


                ContentHome.safeHtml = function (html) {
                    if (html)
                        return $sce.trustAsHtml(html);
                };

                ContentHome.descriptionWYSIWYGOptions = {
                    plugins: 'advlist autolink link image lists charmap print preview',
                    skin: 'lightgray',
                    trusted: true,
                    theme: 'modern',
                    plugin_preview_width: "500",
                    plugin_preview_height: "500"
                };
                ContentHome.data = PeopleInfo.data;
                if (!ContentHome.data.content.images)
                    editor.loadItems([]);
                else
                    editor.loadItems(ContentHome.data.content.images);

                RankOfLastItem.setRank(ContentHome.data.content.rankOfLastItem || 0);
                /**
                 * ContentHome.imageSortableOptions used for ui-sortable directory to drag-drop carousel images Manually.
                 * @type object
                 */
                ContentHome.imageSortableOptions = {
                    handle: '> .cursor-grab'
                };

                /**
                 * ContentHome.itemSortableOptions used for ui-sortable directory to sort people listing Manually.
                 * @type object
                 */
                ContentHome.itemSortableOptions = {
                    handle: '> .cursor-grab',
                    disabled: true,
                    stop: function (e, ui) {
                        var endIndex = ui.item.sortable.dropindex,
                            maxRank = 0,
                            draggedItem = ContentHome.items[endIndex];

                        if (draggedItem) {
                            var prev = ContentHome.items[endIndex - 1],
                                next = ContentHome.items[endIndex + 1];
                            var isRankChanged = false;
                            if (next) {
                                if (prev) {
                                    draggedItem.data.rank = ((prev.data.rank || 0) + (next.data.rank || 0)) / 2;
                                    isRankChanged = true;
                                } else {
                                    draggedItem.data.rank = (next.data.rank || 0) / 2;
                                    isRankChanged = true;
                                }
                            } else {
                                if (prev) {
                                    draggedItem.data.rank = (((prev.data.rank || 0) * 2) + 10) / 2;
                                    maxRank = draggedItem.data.rank;
                                    isRankChanged = true;
                                }
                            }
                            if (isRankChanged) {
                                Buildfire.datastore.update(draggedItem.id, draggedItem.data, TAG_NAMES.PEOPLE, function (err) {
                                    if (err) {
                                        console.error('Error during updating rank');
                                    } else {
                                        if (ContentHome.data.content.rankOfLastItem < maxRank) {
                                            ContentHome.data.content.rankOfLastItem = maxRank;
                                            RankOfLastItem.setRank(maxRank);
                                        }
                                    }
                                })
                            }
                        }
                    }
                };
                ContentHome.itemSortableOptions.disabled = !(ContentHome.data.content.sortBy === SORT.MANUALLY);

                ContentHome.DeepLinkCopyUrl = false;

                /**
                 * tmrDelayForPeopleInfo is used to update peopleInfo after given time in setTimeOut.
                 * @type {null}
                 */
                var tmrDelayForPeopleInfo = null;

                // Send message to widget to return to list layout
                buildfire.messaging.sendMessageToWidget({type: 'Init'});

                /**
                 * saveData(newObj, tag) used to save a new record in datastore.
                 * @param newObj is a new/modified object.
                 * @param tag is a tag name or identity given to the data json during saving the record.
                 */
                var saveData = function (newObj, tag) {
                    if (newObj == undefined)
                        return;
                    newObj.content.rankOfLastItem = newObj.content.rankOfLastItem || 0;

                    Buildfire.datastore.save(newObj, tag, function (err, result) {
                        if (err || !result) {
                            console.error('------------error saveData-------', err);
                        }
                        else {
                            RankOfLastItem.setRank(result.data.content.rankOfLastItem);
                        }
                    });
                };

                /**
                 * getSearchOptions(value) is used to get searchOptions with one more key sort which decide the order of sorting.
                 * @param value is used to filter sort option.
                 * @returns object
                 */
                var getSearchOptions = function (value) {
                    ContentHome.itemSortableOptions.disabled = true;
                    switch (value) {
                        case SORT.OLDEST_TO_NEWEST:
                            ContentHome.searchOptions.sort = {"dateCreated": 1};
                            break;
                        case SORT.NEWEST_TO_OLDEST:
                            ContentHome.searchOptions.sort = {"dateCreated": -1};
                            break;
                        case SORT.FIRST_NAME_A_TO_Z:
                            ContentHome.searchOptions.sort = {"fName": 1};
                            break;
                        case SORT.FIRST_NAME_Z_TO_A:
                            ContentHome.searchOptions.sort = {"fName": -1};
                            break;
                        case SORT.LAST_NAME_A_TO_Z:
                            ContentHome.searchOptions.sort = {"lName": 1};
                            break;
                        case SORT.LAST_NAME_Z_TO_A:
                            ContentHome.searchOptions.sort = {"lName": -1};
                            break;
                        default :
                            ContentHome.itemSortableOptions.disabled = false;
                            ContentHome.searchOptions.sort = {"rank": 1};
                            break;
                    }
                    return ContentHome.searchOptions;
                };

                /**
                 * ContentHome.loadMore() called by infiniteScroll to implement lazy loading
                 */
                ContentHome.noMore = false;
                ContentHome.loadMore = function (search) {
                    Buildfire.spinner.show();
                    if (ContentHome.busy) {
                        return;
                    }

                    ContentHome.busy = true;
                    if (ContentHome.data && ContentHome.data.content.sortBy && !search) {
                        ContentHome.searchOptions = getSearchOptions(ContentHome.data.content.sortBy);
                    }
                    Buildfire.datastore.search(ContentHome.searchOptions, TAG_NAMES.PEOPLE, function (err, result) {
                        if (err) {
                            Buildfire.spinner.hide();
                            return console.error('-----------err in getting list-------------', err);
                        }
                        if (result.length <= SORT._limit) {// to indicate there are more
                            ContentHome.noMore = true;
                            Buildfire.spinner.hide();
                        } else {
                            result.pop();
                            ContentHome.searchOptions.skip = ContentHome.searchOptions.skip + SORT._limit;
                            ContentHome.noMore = false;
                        }
                        ContentHome.items = ContentHome.items ? ContentHome.items.concat(result) : result;
                        ContentHome.busy = false;
                        Buildfire.spinner.hide();
                        $scope.$digest();
                    });
                };
                /**
                 * Used to show/hide alert message when item's deep-link copied from people list.
                 */
                ContentHome.openDeepLinkDialog = function (item) {
                    ContentHome.DeepLinkCopyUrl = true;
                    if (item && item.data && !item.data.deepLinkUrl) {
                        item.data.deepLinkUrl = Buildfire.deeplink.createLink({id: item.id});
                        ContentHome.updateItemData(item);
                    }
                    setTimeout(function () {
                        ContentHome.DeepLinkCopyUrl = false;
                        $scope.$apply();
                    }, 1500);
                };

                ContentHome.updateItemData = function (item) {
                    Buildfire.datastore.update(item.id, item.data, TAG_NAMES.PEOPLE, function (err, result) {
                        if (err)
                            return console.error('There was a problem saving your data');
                    });
                };

                /**
                 * method to open the importCSV Dialog
                 */
                ContentHome.openImportCSVDialog = function () {

                    buildfire.navigation.scrollTop();

                    var modalInstance = $modal
                        .open({
                            templateUrl: 'templates/modals/import-csv.html',
                            controller: 'ImportCSVPopupCtrl',
                            controllerAs: 'ImportCSVPopup',
                            size: 'sm'
                        });
                    modalInstance.result.then(function (rows) {
                        Buildfire.spinner.show();
                        if (rows && rows.length) {
                            var rank = ContentHome.data.content.rankOfLastItem || 0;
                            for (var index = 0; index < rows.length; index++) {
                                rank += 10;
                                rows[index].dateCreated = +new Date();
                                rows[index].socialLinks = [];
                                rows[index].rank = rank;
                            }
                            if (validateCsv(rows)) {
                                Buildfire.datastore.bulkInsert(rows, TAG_NAMES.PEOPLE, function (err, data) {
                                    Buildfire.spinner.hide();
                                    $scope.$apply();
                                    if (err) {
                                        console.error('There was a problem while importing the file----', err);
                                    }
                                    else {
                                        console.info('File has been imported----------------------------');
                                        ContentHome.busy = false;
                                        ContentHome.noMore = false;
                                        ContentHome.items = null;
                                        ContentHome.searchOptions.skip = 0;
                                        ContentHome.loadMore();
                                        ContentHome.data.content.rankOfLastItem = rank;
                                    }
                                });
                            } else {
                                Buildfire.spinner.hide();
                                //$scope.$apply();
                                ContentHome.csvDataInvalid = true;
                                $timeout(function hideCsvDataError() {
                                    ContentHome.csvDataInvalid = false;
                                }, 2000)
                            }
                        }
                        else {
                            Buildfire.spinner.hide();
                            $scope.$apply();
                        }
                    }, function (error) {
                        Buildfire.spinner.hide();
                        // $scope.$apply();
                        //do something on cancel
                    });
                };

                /**
                 * ContentHome.exportCSV() used to export people list data to CSV
                 */
                ContentHome.exportCSV = function () {
                    getRecords({
                            filter: {"$json.fName": {"$regex": '/*'}},
                            skip: 0,
                            limit: SORT._maxLimit + 1 // the plus one is to check if there are any more
                        },
                        []
                        , function (err, data) {
                            if (err) {
                                return console.error('Err while exporting data--------------------------------', err);
                            }
                            if (data && data.length) {
                                var persons = [];
                                angular.forEach(angular.copy(data), function (value) {
                                    delete value.data.dateCreated;
                                    delete value.data.iconImage;
                                    delete value.data.socialLinks;
                                    delete value.data.rank;
                                    persons.push(value.data);
                                });
                                var csv = FormatConverter.jsonToCsv(angular.toJson(persons), {
                                    header: header
                                });
                                FormatConverter.download(csv, "Export.csv");
                            }
                            else {
                                ContentHome.getTemplate();
                            }
                            records = [];
                        });
                };
                /**
                 * records holds the data to export the data.
                 * @type {Array}
                 */
                var records = [];

                /**
                 * getRecords function get the  all items from DB
                 * @param searchOption
                 * @param records
                 * @param callback
                 */
                function getRecords(searchOption, records, callback) {
                    console.log("Data length", records.length);
                    Buildfire.datastore.search(searchOption, TAG_NAMES.PEOPLE, function (err, result) {
                        if (err) {
                            console.error('-----------err in getting list-------------', err);
                            return callback(err, []);
                        }
                        if (result.length <= SORT._maxLimit) {// to indicate there are more
                            records = records.concat(result);
                            return callback(null, records);
                        }
                        else {
                            result.pop();
                            searchOption.skip = searchOption.skip + SORT._maxLimit;
                            records = records.concat(result);
                            return getRecords(searchOption, records, callback);
                        }
                    });
                }

                /**
                 * ContentHome.getTemplate() used to download csv template
                 */
                ContentHome.getTemplate = function () {
                    var templateData = [{
                        topImage: "",
                        fName: "",
                        lName: "",
                        position: "",
                        bodyContent: ""
                    }];
                    var csv = FormatConverter.jsonToCsv(angular.toJson(templateData), {
                        header: header
                    });
                    FormatConverter.download(csv, "Template.csv");
                };

                /**
                 * ContentHome.removeListItem() used to delete an item from people list
                 * @param _index tells the index of item to be deleted.
                 */
                ContentHome.removeListItem = function (_index) {

                    buildfire.navigation.scrollTop();

                    var modalInstance = $modal.open({
                        templateUrl: 'templates/modals/remove-people.html',
                        controller: 'RemovePeoplePopupCtrl',
                        controllerAs: 'RemovePeoplePopup',
                        size: 'sm',
                        resolve: {
                            peopleInfo: function () {
                                return ContentHome.items[_index];
                            }
                        }
                    });
                    modalInstance.result.then(function (message) {
                        if (message === 'yes') {
                            var item = ContentHome.items[_index];
                            Buildfire.datastore.delete(item.id, TAG_NAMES.PEOPLE, function (err, result) {
                                if (err)
                                    return;
                                ContentHome.items.splice(_index, 1);
                                $scope.$digest();
                            });
                        }
                    }, function (data) {
                        //do something on cancel
                    });
                };

                /**
                 * ContentHome.searchListItem() used to search people list
                 * @param value to be search.
                 */
                ContentHome.searchListItem = function (value) {
                    var fullName = '';
                    ContentHome.searchOptions.skip = 0;
                    ContentHome.busy = false;
                    ContentHome.items = null;
                    if (value) {
                        value = value.trim();
                        if (value.indexOf(' ') !== -1) {
                            fullName = value.split(' ');
                            ContentHome.searchOptions.filter = {
                                "$and": [{
                                    "$json.fName": {
                                        "$regex": fullName[0],
                                        "$options": "i"
                                    }
                                }, {"$json.lName": {"$regex": fullName[1], "$options": "i"}}]
                            };
                        } else {
                            fullName = value;
                            ContentHome.searchOptions.filter = {
                                "$or": [{
                                    "$json.fName": {
                                        "$regex": fullName,
                                        "$options": "i"
                                    }
                                }, {"$json.lName": {"$regex": fullName, "$options": "i"}}]
                            };
                        }
                    } else {
                        ContentHome.searchOptions.filter = {"$json.fName": {"$regex": '/*'}};
                    }
                    ContentHome.loadMore('search');
                };

                /**
                 * ContentHome.sortPeopleBy(value) used to sort people list
                 * @param value is a sorting option
                 */
                ContentHome.sortPeopleBy = function (value) {
                    if (!value) {
                        console.info('There was a problem sorting your data');
                    } else {
                        ContentHome.items = null;
                        ContentHome.searchOptions.skip = 0;
                        ContentHome.busy = false;
                        ContentHome.data.content.sortBy = value;
                        ContentHome.loadMore();
                    }
                };

                /**
                 * saveDataWithDelay(infoData) called when PEOPLE_INFO data get changed
                 * @param infoData is the modified object returned by $scope.$watch.
                 */
                var saveDataWithDelay = function (infoData) {
                    if (infoData) {
                        if (tmrDelayForPeopleInfo) {
                            $timeout.cancel(tmrDelayForPeopleInfo);
                        }
                        tmrDelayForPeopleInfo = $timeout(function () {
                            if (initialLoad) {
                                if (infoData.default) {
                                    delete infoData.default;
                                    infoData.content.description = '';
                                    infoData.content.images = [];
                                    $timeout(function(){
                                        $("#carousel").html('');
                                        // create a new instance of the buildfire carousel editor
                                        var editor = new Buildfire.components.carousel.editor("#carousel");
                                        // this method will be called when a new item added to the list
                                        editor.onAddItems = function (items) {
                                            if (!ContentHome.data.content.images)
                                                ContentHome.data.content.images = [];
                                            ContentHome.data.content.images.push.apply(ContentHome.data.content.images, items);
                                            $scope.$digest();
                                        };
                                        // this method will be called when an item deleted from the list
                                        editor.onDeleteItem = function (item, index) {
                                            ContentHome.data.content.images.splice(index, 1);
                                            $scope.$digest();
                                        };
                                        // this method will be called when you edit item details
                                        editor.onItemChange = function (item, index) {
                                            ContentHome.data.content.images.splice(index, 1, item);
                                            $scope.$digest();
                                        };
                                        // this method will be called when you change the order of items
                                        editor.onOrderChange = function (item, oldIndex, newIndex) {
                                            var items = ContentHome.data.content.images;

                                            var tmp = items[oldIndex];

                                            if (oldIndex < newIndex) {
                                                for (var i = oldIndex + 1; i <= newIndex; i++) {
                                                    items[i - 1] = items[i];
                                                }
                                            } else {
                                                for (var i = oldIndex - 1; i >= newIndex; i--) {
                                                    items[i + 1] = items[i];
                                                }
                                            }
                                            items[newIndex] = tmp;

                                            ContentHome.data.content.images = items;
                                            $scope.$digest();
                                        };

                                    },1000);
                                }
                                console.log('lakshay',infoData);
                                saveData(JSON.parse(angular.toJson(infoData)), TAG_NAMES.PEOPLE_INFO);
                            }
                            initialLoad = true;
                        }, 500);
                    }
                };

                /**
                 * $scope.$watch used to determine that ContentHome.data has changed.
                 */
                $scope.$watch(function () {
                    return ContentHome.data;
                }, saveDataWithDelay, true);

            }])
})(window.angular, window.buildfire);
