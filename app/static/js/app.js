angular.module('civic-graph', ['ui.bootstrap', 'leaflet-directive'])
.constant('_', window._)
.config(function($locationProvider) {
    $locationProvider.html5Mode(true);
})
.controller('homeCtrl', function($scope, $http, $location, $modal) {
    $scope.entities = [];
    $scope.categories = [];
    $scope.currentEntity;
    $scope.clickedEntity = {};
    $scope.clickedEntity.entity = null;
    $scope.editEntity;
    $scope.connections = {};
    $scope.editing = false;
    $scope.mobile = $(window).width() < 768;
    $scope.settingsEnabled = !$scope.mobile;

    $scope.toggleSettings = function() {
        console.log($(window).width())
        $scope.settingsEnabled = !$scope.settingsEnabled;
    }

    $scope.renderTwitterImage = function(twitter_handle){
        return 'https://twitter.com/'+ twitter_handle +'/profile_image';
    }
    $scope.renderBingOrg = function(name){
        var searchString = name.replace(" ", "%20")
        var url = 'http://www.bing.com/search?q='+ searchString +'&go=Submit'
        return url;
    }
    $scope.getURLID = function() {
        var entityID = $location.search().entityID;
        if (entityID) {entityID = parseInt(entityID);};
        return entityID
    }
    $http.get('entities')
        .success(function(data) {
            $scope.entities = data.nodes;
            if ($scope.getURLID()) {
                // Set the entity to the ID in the URL if it exists.
                $scope.setEntityID($scope.getURLID());
            } else {
                $scope.currentEntity = $scope.entities[0];
            }
        });
    // Maybe get from database.
    $scope.entityTypes = {
        'Government': true,
        'For-Profit': true,
        'Non-Profit': true,
        'Individual': true
    };
    // Get from database.
    $scope.connectionTypes = {
        'Funding': true,
        'Data': true,
        'Employment': true,
        'Collaboration': true,
    };

    $scope.influenceTypes = ['Local', 'National', 'Global']
    $scope.sizeBys = [{'name': 'Employees', 'value': 'employees'},{'name': 'Twitter Followers', 'value': 'followers'}];
    $scope.sizeBy = 'employees';

    $scope.views = [
        {'name': 'Network', 'url': 'static/partials/network.html'},
        {'name': 'Map', 'url': 'static/partials/map.html'}
    ];

    $scope.template = $scope.views[0];

    $scope.changeView = function(view) {
        $scope.template = _.find($scope.views, {'name': view});
    }
    $scope.changeView('Network');

    $scope.setEntity = function(entity) {
        $scope.currentEntity = entity;
        if ($scope.editing) {
            $scope.stopEdit();
        }
        console.log($scope.clickedEntity.entity);
        $scope.$broadcast('entityChange');
    }
    $scope.selectEntity = function(entity) {
        $scope.setEntity(entity);
        $scope.$broadcast('selectEntity');
    };
    $scope.setEntityID = function(id) {
        $scope.setEntity(_.find($scope.entities, {'id': id}));
    }
    $scope.setEntities = function(entities) {
        $scope.entities = entities;
    }

    $scope.startEdit = function(entity) {
        if (entity) {
            $scope.editEntity = entity;
        } else {
            newEntity = {};
            _.forEach($scope.entities[0], function(value, key) {
                newEntity[key] = _.isArray(value) ? [] : null;
            });
            $scope.editEntity = newEntity;
        }
        $scope.editing = true;
    }

    $scope.stopEdit = function() {
        $scope.editing = false;
    }

    $scope.changeSizeBy = function(sizeBy) {
        $scope.$broadcast('changeSizeBy', $scope.sizeBy);
    }

    $scope.toggleLink = function(type) {
        $scope.$broadcast('toggleLink', {'name':type, 'enabled': $scope.connectionTypes[type]});
    }

    $scope.toggleNode = function(type) {
        $scope.$broadcast('toggleNode', {'name':type, 'enabled': $scope.entityTypes[type]});
    }

    $scope.animationsEnabled = true;

    $scope.showAbout = function () {
        $modal.open({
            animation: false,
            templateUrl: 'static/partials/about.html',
            controller: function($scope, $modalInstance) {
                $scope.closeWindow = function () {
                    $modalInstance.close();
                }
            }
        });
    }

    $http.get('categories')
        .success(function(data) {
            $scope.categories = data.categories;
        });
    // See https://coderwall.com/p/ngisma/safe-apply-in-angular-js
    $scope.safeApply = function(fn) {
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn && (typeof(fn) === 'function')) {fn();}
        } else {this.$apply(fn);}
    };
})
.controller('detailsCtrl', function($scope, $http) {
    $scope.itemsShownDefault = {'key_people': 5, 'grants_given': 5, 'grants_received': 5, 'investments_made': 5, 'investments_received': 5, 'collaborations': 5, 'employments': 5, 'relations': 5, 'data_given': 5, 'data_received': 5, 'revenues': 5, 'expenses': 5}
    $scope.itemsShown = _.clone($scope.itemsShownDefault);

    $scope.$on('entityChange', function(event) {
        // Reset items shown in details list.
        $scope.itemsShown = _.clone($scope.itemsShownDefault);
    });
    $scope.showMore = function(type) {
        $scope.itemsShown[type] = $scope.currentEntity[type].length;
    }
    $scope.showLess = function(type) {
        $scope.itemsShown[type] = $scope.itemsShownDefault[type];
    }
})
.controller('editCtrl', function($scope, $http) {
    $scope.updating = false;

    $scope.addressSearch = function(search) {
        return $http.jsonp('http://dev.virtualearth.net/REST/v1/Locations', {params: {query: search, key: 'Ai58581yC-Sr7mcFbYTtUkS3ixE7f6ZuJnbFJCVI4hAtW1XoDEeZyidQz2gLCCyD', 'jsonp': 'JSON_CALLBACK', 'incl': 'ciso2'}})
            .then(function(response) {
                return response.data.resourceSets[0].resources
            });
    }

    $scope.setLocation = function(location, data) {
        location.full_address = 'formattedAddress' in data.address ? data.address.formattedAddress : null;
        location.address_line = 'addressLine' in data.address ? data.address.addressLine : null;
        location.locality = 'locality' in data.address ? data.address.locality : null;
        location.district = 'adminDistrict' in data.address ? data.address.adminDistrict : null;
        location.postal_code = 'postalCode' in data.address ? data.address.postalCode : null;
        location.country = 'countryRegion' in data.address ? data.address.countryRegion : null;
        location.country_code = 'countryRegionIso2' in data.address ? data.address.countryRegionIso2 : null;
        location.coordinates = 'point' in data ? data.point.coordinates : null;
    }

    $scope.addLocation = function(locations) {
        if (!_.some(locations, {'full_address':'', 'id': null})) {
            locations.push({'full_address':'', 'id': null});
        }
    }
    $scope.addLocation($scope.editEntity.locations);

    $scope.editCategories = _.map($scope.categories, function(c) {
        return {'name': c.name, 'enabled': _.some($scope.editEntity.categories, {'name': c.name}), 'id': c.id}
    });

    $scope.addKeyPerson = function() {
        // Add blank field to edit if there are none.
        // WATCH OUT! TODO: If someone deletes an old person, delete their id too.
        // i.e. make sure old/cleared form fields aren't being edited into new people.
        if (!(_.some($scope.editEntity.key_people, {'name': '', 'id': null}))) {
            $scope.editEntity.key_people.push({'name':'', 'id': null});
        }

    }
    $scope.addKeyPerson();

    $scope.setFundingConnection = function(entity, funding) {
        // Add other entity's id to this finance connection.
        funding.entity_id = entity.id;
    }

    $scope.addFundingConnection = function(funding) {
        if (!_.some(funding, {'entity':''})) {
            // Maybe set amount to 0 instead of null?
            funding.push({'entity':'', 'amount': null,'year': null, 'id': null});
        }
    }
    $scope.addFundingConnection($scope.editEntity.grants_received);
    $scope.addFundingConnection($scope.editEntity.investments_received);
    $scope.addFundingConnection($scope.editEntity.grants_given);
    $scope.addFundingConnection($scope.editEntity.investments_made);

    $scope.setConnection = function(entity, connection) {
        connection.entity_id = entity.id;
    }

    $scope.addConnection = function(connections) {
        // Add an empty connection to edit if none exist.
        if (!_.some(connections, {'entity':'', 'id': null})) {
            connections.push({'entity':'', 'id': null, 'details': null});
        }
    }
    $scope.addConnection($scope.editEntity.data_given);
    $scope.addConnection($scope.editEntity.data_received);
    $scope.addConnection($scope.editEntity.collaborations);
    $scope.addConnection($scope.editEntity.employments);
    $scope.addConnection($scope.editEntity.relations);

    $scope.addFinance = function(records) {
        // Add new finance field if all current fields are valid.
        if (_.every(records, function(r) {return r.amount > 0 && r.year > 1750})) {
            records.push({'amount': null, 'year': null, 'id': null});
        }
    }
    $scope.addFinance($scope.editEntity.revenues);
    $scope.addFinance($scope.editEntity.expenses);

    $scope.removeEmpty = function() {
        // Clear the empty unedited new items.
        $scope.editEntity.categories = _.filter($scope.editCategories, 'enabled');
        _.remove($scope.editEntity.locations, function(l){return l.full_address == '';});
        _.remove($scope.editEntity.key_people, function(p){return p.name == '';});
        _.remove($scope.editEntity.grants_received, function(f){return f.entity == '';});
        _.remove($scope.editEntity.investments_received, function(f){return f.entity == '';});
        _.remove($scope.editEntity.grants_given, function(f){return f.entity == '';});
        _.remove($scope.editEntity.investments_made, function(f){return f.entity == '';});
        _.remove($scope.editEntity.data_given, function(d){return d.entity == '';});
        _.remove($scope.editEntity.data_received, function(d){return d.entity == '';});
        _.remove($scope.editEntity.collaborations, function(c){return c.entity == '';});
        _.remove($scope.editEntity.employments, function(c){return c.entity == '';});
        _.remove($scope.editEntity.relations, function(c){return c.entity == '';});
        _.remove($scope.editEntity.revenues, function(r){return r.amount <= 0 || r.year < 1750;});
        _.remove($scope.editEntity.expenses, function(e){return e.amount <= 0 || e.year < 1750;;});
    }

    $scope.savetoDB = function() {
        $scope.updating = true;
        $http.post('save', {'entity': $scope.editEntity})
            .then(function(response) {
                $scope.setEntities(response.data.nodes);
                $scope.setEntityID($scope.editEntity.id);
                // Call to homeCtrl's parent stopEdit() to change view back and any other high-level changes.
                $scope.updating = false;
            });
    }
    $scope.cancelEdit = function() {
        $scope.removeEmpty();
        $scope.stopEdit();
    }
    $scope.save = function() {
        $scope.removeEmpty();
        $scope.savetoDB();
    }

})
.controller('networkCtrl', function($scope, $http, $timeout) {
    // TODO: Make a hashmap on the backend of id -> position, then use source: entities[map[sourceid]] to get nodes.
    // See http://stackoverflow.com/q/16824308
    $scope.showLicense =  true;

    $http.get('connections').
        success(function(data) {
            _.forEach(_.keys(data.connections), function(type) { $scope.connections[type] = []; });
            _.forEach(data.connections, function(connections, type) {
                _.forEach(connections, function(connection) {
                    var sourceNode = _.find($scope.entities, {'id': connection.source});
                    var targetNode = _.find($scope.entities, {'id': connection.target});
                    $scope.connections[type].push({'source': sourceNode, 'target': targetNode});
                });
            });
            drawNetwork();
        });
    scale = {
        'employees': d3.scale.sqrt().domain([10, 130000]).range([10, 50]),
        'followers': d3.scale.sqrt().domain([10, 1000000]).range([10, 50])
    }
    var resize =  function (){
        if ($scope.template.name == 'Network') {
            var panZoomNetwork = svgPanZoom('#network', {zoomScaleSensitivity:0.01});
            panZoomNetwork.resize(true);
            panZoomNetwork.fit(true);
            panZoomNetwork.center(true);
            panZoomNetwork.disableDblClickZoom(true)
        }
    };

    window.onresize = resize;

    var drawNetwork = function() {
        var svg = d3.select('#network');
        var bounds = svg.node().getBoundingClientRect();
        var height = bounds.height;
        var width = bounds.width;
        var offsetScale = 8;
        var defaultnodesize = 7;

        var offsets = {
            'Individual': {'x': 2.9, 'y': 1},
            'For-Profit': {'x': 2.9, 'y': -1},
            'Non-Profit': {'x': -2.9, 'y': 1},
            'Government': {'x': -2.9, 'y': -1}
        }
        var links = {};
        var force = d3.layout.force()
            .size([width, height])
            .nodes($scope.entities)
            .links(_.flatten(_.values($scope.connections)))
            .charge(function(d) {
                return d.employees ? -2*scale.employees(d.employees) : -25;
            })
            .linkStrength(0)
            .linkDistance(50);

        _.forEach($scope.connections, function(connections, type) {
            links[type] = svg.selectAll('.link .'+type+'-link')
            .data(connections)
            .enter().append('line')
            .attr('class', function(d) {d.type = type; return 'link '+type+'-link '+d.source.type+'-link '+d.target.type+'-link';});
        });

        var node = svg.selectAll('.node')
            .data($scope.entities)
            .enter().append('g')
            .attr('class', function(d) {return 'node '+d.type+'-node';})
            .call(force.drag);

        node.append('circle')
            .attr('r', function(d) {return d.employees ? scale['employees'](d.employees) : defaultnodesize;});

        node.append('text')
            //.attr('dx', 10)
            .attr('dy', '.35em')
            .text(function(d) {return d.name;});

        force.on('tick', function(e) {
            // Cluster in four corners based on offset.
            var k = offsetScale*e.alpha;
            // console.log(e.alpha)
             if (e.alpha < 0.02) { resize();};
            _.forEach($scope.entities, function(entity) {
                entity.x += offsets[entity.type].x*k
                entity.y += offsets[entity.type].y*k
            });

            _.forEach(links, function(link, type) {
                link
                .attr('x1', function(d) {return d.source.x;})
                .attr('y1', function(d) {return d.source.y;})
                .attr('x2', function(d) {return d.target.x;})
                .attr('y2', function(d) {return d.target.y;})
            });
            node.attr('transform', function(d) {return 'translate('+d.x+','+d.y+')';});
        });
        var speedAnimate = function(ticks) {
            // Speed up the initial animation.
            // See http://stackoverflow.com/a/26189110
            requestAnimationFrame(function render() {
                for (var i = 0; i < ticks; i++) {
                    force.tick();
                }
                if (force.alpha() > 0) {
                    requestAnimationFrame(render);
                }
            });
        }
        speedAnimate(7);
        force.start();


        // Hash linked neighbors for easy hovering effects.
        // See http://stackoverflow.com/a/8780277
        var linkedByIndex = {};
        _.forEach(links, function(l, type) {
            _.forEach(l[0], function(connection) {
                var source = connection.__data__.source;
                var target = connection.__data__.target;
                linkedByIndex[source.index+','+target.index] = true;
                linkedByIndex[target.index+','+source.index] = true;
            });
        });

        var neighboring = function(a, b) {
            return linkedByIndex[a.index+','+b.index] | a.index == b.index;
        }

        var focusneighbors = function(entity) {
            // Apply 'unfocused' class to all non-neighbors.
            // Apply 'focused' class to all neighbors.
            // TODO: See if it can be done with just one class and :not(.focused) CSS selectors.
            node
            .classed('focused', function(n) {
                return neighboring(entity, n);
            })
            .classed('unfocused', function(n) {
                return !neighboring(entity, n);
            });

            _.forEach(links, function(link, type) {
                link
                .classed('focused', function(o) {
                    return entity.index==o.source.index | entity.index==o.target.index;
                })
                .classed('unfocused', function(o) {
                    return !(entity.index==o.source.index | entity.index==o.target.index);
                });
            });
        }

        var focus = function(entity) {
            if ($scope.currentEntity != entity) $scope.setEntity(entity);
            $scope.safeApply();
            focusneighbors(entity);
        }

        var unfocus = function(entity) {
            //var transitiondelay = 75;
            node
            .classed('focused', false)
            .classed('unfocused', false);
            _.forEach(links, function(link, type) {
                link
                .classed('focused', false)
                .classed('unfocused', false);
            });
            entity.fixed = false;
            // Restart d3 animations.
            if ($scope.clickedEntity.entity) force.resume();
            //TODO: Show generic details and not individual entity details?
        }

        var hover = function(entity) {
            if (!$scope.clickedEntity.entity) {
                focus(entity);
            }
        }

        var unhover = function(entity) {
            if (!$scope.clickedEntity.entity) {
                unfocus(entity);
            }
        }

        var click = function(entity) {
            console.log('click');
            $scope.showLicense = false;
            if ($scope.clickedEntity.entity == entity) {
                $scope.clickedEntity.entity = null;
            } else {
                if ($scope.clickedEntity.entity) unfocus($scope.clickedEntity.entity);
                $scope.clickedEntity.entity = entity;
                focus(entity);
            }

            // Stop event so we don't detect a click on the background.
            // See http://stackoverflow.com/q/22941796
            if (d3.event) {d3.event.stopPropagation();}
        }

        var dblclick = function(entity) {
            if (entity.fixed == false) {
                entity.x = width/2;
                entity.y = height/2;
                entity.px = width/2;
                entity.py = height/2;
                entity.fixed = true;
                $scope.clickedEntity.entity = entity;
            } else {
                unfocus(entity);
            }
        }

        var backgroundclick = function() {
            if ($scope.clickedEntity.entity) {
                unfocus($scope.clickedEntity.entity);
                $scope.clickedEntity.entity = null;
            }
            $scope.safeApply();
            //TODO: Show generic details and not individual entity details.
        }
        node.on('mouseover', hover);
        node.on('mouseout', unhover);
        node.on('click', click);
        node.on('dblclick', dblclick);
        svg.on('click', backgroundclick);

        // Only show labels on top 5 most connected entities initially.
        _.forEach(_.keys($scope.entityTypes), function(type) {
            // Find the top 5 most-connected entities.
            var top5 = _.takeRight(_.sortBy(_.filter($scope.entities, {'type': type}), 'weight'), 5);
            _.forEach(top5, function(entity) {entity.wellconnected = true;});
        });

        node
        .classed('wellconnected', function(d) {return d.hasOwnProperty('wellconnected');})

        $scope.$on('changeSizeBy', function(event, sizeBy) {
            svg.selectAll('circle')
            .transition()
            .duration(250)
            .attr('r', function(d) {return d[sizeBy] ? scale[sizeBy](d[sizeBy]) : defaultnodesize;});
        });
        $scope.$on('toggleLink', function(event, link) {
            links[link.name]
            .classed({'visible': link.enabled, 'hidden': !link.enabled});
        });
        $scope.$on('toggleNode', function(event, type) {
            svg
            .selectAll('.'+type.name+'-node')
            .classed({'visible': type.enabled, 'hidden': !type.enabled});

            svg
            .selectAll('.'+type.name+'-link')
            .classed({
                'visible': function(l) {
                    // ConnectionType enabled, connection source entity type is enabled, connection target entity type is enabled.
                    return $scope.connectionTypes[l.type] && ($scope.entityTypes[l.source.type] && $scope.entityTypes[l.target.type]);
                },
                'hidden': function (l) {
                    // If any of ConnectionType, source entity type, or target entity type are disabled.
                    return !$scope.connectionTypes[l.type] || (!$scope.entityTypes[l.source.type] || !$scope.entityTypes[l.target.type]);
                }
            });

        });

        $scope.$on('selectEntity', function(event) {
            click($scope.currentEntity);
        });
        // Focus the entity if it's in URL params.
        if ($scope.getURLID()){
            click($scope.currentEntity);
            //Clear entityID from URL if you want... Maybe don't do this here.
            //$location.search('entityID', null);
        };

    }
})
.controller('mapCtrl', ['$scope', '$timeout', 'leafletData', function($scope, $timeout, leafletData) {
    $scope.markers = [];
    $scope.options = {
        center: {
            lat: 20.00,
            lng: -40.00,
            zoom: 3
        },
        defaults: {
            tileLayerOptions: {
                detectRetina: true,
                reuseTiles: false
            }
        }
    }
    $scope.events = {
        marker: {
            enable: ['click'],
            logic: 'emit'
        }
    }
    $timeout(function () {
        leafletData.getMap().
        then(function(map) {
            map.invalidateSize();
            _.forEach($scope.entities, function(entity) {
                _.forEach(entity.locations, function(loc) {
                    $scope.markers.push({'group': loc.locality, 'lat': loc.coordinates[0], 'lng': loc.coordinates[1], 'message': entity.name, 'entity_id': entity.id});
                });
            });
            $scope.$on('leafletDirectiveMarker.click', function(e, args) {
                $scope.setEntityID(args.model.entity_id);
            });
            map.locate({setView: true, maxZoom: 11});
        });
    });

}]);
