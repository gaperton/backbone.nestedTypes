define( function( require, exports, module ){
    var Nested = require( 'nestedtypes' );

    var N = Nested.Model.extend({
        defaults:{
            time: Date,
            text: '',
            number: 1
        },

        url: '/',

        save: function(){}
    });

    var Main = Nested.Model.extend({
        defaults:{
            first: N,
            second: N,
            count: 0,
            sum: 0
        }
    });

    describe( 'Extended defaults functionality', function(){
        var M, M1;

        it( 'create native properties for defaults', function( done ){
            M = Nested.Model.extend({
                defaults: {
                    a: 1,
                    b: 'ds'
                },

                some: 4
            });

            var m = new M();

            m.a.should.eql( 1 );
            m.b.should.eql( 'ds' );
            m.some.should.eql( 4 );

            m.once( 'change:b', function(){
                m.b.should.eql( '5' );
                done();
            });

            m.b = 5;
        });


        it( 'inherit defaults from the base class', function(){
            M1 = M.extend({
                defaults: {
                    d: 1,
                    a: 'e'
                }
            });

            var m = new M1();

            m.a.should.eql( 'e' );
            m.d.should.eql( 1 );
            m.b.should.eql( 'ds' );
            m.some.should.eql( 4 );
        });
    });

    describe( 'constructors in defaults', function(){
        var user, User = Nested.Model.extend({
            attributes:{
                created: Date,
                name: String,
                loginCount: Number
            }
        });

        before( function(){
            user = new User();
        });

        it( 'create default values for constructor attributes', function(){
            user.created.should.be.instanceof( Date );
            user.name.should.eql( '' );
            user.loginCount.should.eql( 0 );
        });

        it( 'cast attribute values to defined types on assignment', function(){
            var type;

            user.loginCount = "5";
            user.loginCount.should.be.number;
            type = typeof user.loginCount;
            type.should.eql( 'number' );

            user.loginCount = "djkjkj";
            user.loginCount.should.be.NaN;

            // parse Date from string
            user.created = "2012-12-12T10:00";
            user.created.should.be.instanceof( Date );
            user.created.toISOString().should.be.eql( '2012-12-12T10:00:00.000Z' );

            // parse Date from timestamp
            user.created = 1234567890123;
            user.created.should.be.instanceof( Date );
            user.created.toISOString().should.be.eql( '2009-02-13T23:31:30.123Z' );

            user.name = 34;
            user.name.should.be.string;
            user.name.should.be.eql( '34' );

            user.name = 'Joe';
            type = typeof user.name;
            type.should.eql( 'string' );
            user.name.should.be.eql( 'Joe' );
        });

        describe( 'JSON', function(){
            var comment, Comment = Nested.Model.extend({
                defaults: {
                    created: Date,
                    author: User,
                    text: String
                }
            });

            before( function(){
                comment = new Comment({
                    created: '2012-11-10T13:14:15.123Z',
                    text: 'bla-bla-bla',
                    author: {
                        created: '2012-11-10T13:14:15.123Z',
                        name: 'you'
                    }
                });
            });

            it( 'initialize model with JSON defaults ', function(){
                var M = Nested.Model.extend({
                    defaults : {
                        a : [ 1, 2 ],
                        b : { a: 1, b : [ 2 ] },
                        f : Date.value( "2012-12-12T12:12" ),
                        g : Date.options({
                            value : "2012-12-12T12:12"
                        })
                    }
                });

                var m1 = new M(), m2 = new M();

                m1.a.push( 3 );
                m2.a.should.not.include( 3 );

                m1.b.b.push( 3 );
                m2.b.b.should.not.include( 3 );

                m1.f.should.be.instanceOf( Date );
                m1.g.should.be.instanceOf( Date );

                m1.f.getTime().should.eql( 1355314320000 );
                m1.g.getTime().should.eql( 1355314320000 );

            });

            it( 'create nested models from JSON', function(){
                comment.created.should.eql( comment.author.created );
                comment.created.should.be.instanceof( Date );
                comment.author.created.should.be.instanceof( Date );
            });

            it( 'serialize nested models to JSON', function(){
                var json = comment.toJSON();

                json.created.should.be.string;
                json.author.created.should.be.string;
                json.created.should.eql( json.author.created );
            });
        });

    });

    describe( 'event bubbling', function(){
        function shouldFireChangeOnce( model, attr, todo ){
            var change = sinon.spy(),
                attrs = attr.split( ' ' );

            model.on( 'change', change );

            var changeAttrs = _.map( attrs, function( name ){
                var changeName = sinon.spy();
                model.on( 'change:' + name, changeName );
                return changeName;
            });

            todo( model );

            change.should.be.calledOnce;
            model.off( change );

            _.each( changeAttrs, function( spy ){
                spy.should.be.calledOnce;
                model.off( spy );
            });
        }

        describe( 'model with nested model', function(){

            it( 'bubble single attribute local change event', function(){
                shouldFireChangeOnce( new Main(), 'first', function( model ){
                    model.first.text = 'bubble';
                });
            });

            it( "shouldn't bubble events if not required", function(){
                var M = Nested.Model.extend({
                    defaults : {
                        first : Main,
                        second : Main.options({
                            triggerWhenChanged : false
                        })
                    }
                });

                shouldFireChangeOnce( new M(), 'first', function( model ){
                    model.first.first.text = "bubble";
                    model.second.first.text = 'not bubble';
                });
            });

            it( 'emit single change event with local event handlers', function(){
                shouldFireChangeOnce( new Main(), 'first', function( model ){
                    model.on( 'change:first', function(){
                        model.count += 1;
                    });

                    model.on( 'change:first', function(){
                        model.sum += 1;
                    });

                    model.first.text = 'bubble';
                });
            });

            it( 'emit single change event in case of bulk change', function(){
                shouldFireChangeOnce( new Main(), 'first second', function( model ){
                    model.set({
                        count: 1,

                        first: {
                            time: '2012-12-12 12:12',
                            text: 'hi'
                        },

                        second: {
                            time: '2012-12-12 12:12',
                            text: 'hi'
                        }
                    });
                });
            });
        });

        describe( 'model with nested collection', function(){
            var Coll = Nested.Collection.extend({
                model: N
            });

            var Compound = Main.extend({
                defaults:{
                    items: Coll
                }
            });

            var compd = new Compound();

            it( 'trigger change when models are added to nested collection', function(){
                shouldFireChangeOnce( compd, 'items', function(){
                    compd.items.create({
                        time: "2012-12-12 12:12"
                    });
                });

                shouldFireChangeOnce( compd, 'items', function(){
                    compd.items.add([{
                        time: "2012-12-12 12:12"
                    },{
                        time: "2012-12-12 12:12"
                    }]);
                });
            });

            it( 'trigger change when model is changed in nested collection', function(){
                shouldFireChangeOnce( compd, 'items', function(){
                    compd.items.first().text = 'Hi there!';
                });
            });

            it( 'trigger change when models are removed from nested collection', function(){
                shouldFireChangeOnce( compd, 'items', function(){
                    compd.items.remove( compd.items.first() );
                });

                shouldFireChangeOnce( compd, 'items', function(){
                    compd.items.remove([ compd.items.first(), compd.items.last() ]);
                });
            });

            it( "trigger change on nested collection's reset", function(){
                shouldFireChangeOnce( compd, 'items', function(){
                    compd.items.reset([{
                            id: 1,
                            time: "2012-12-12 12:12"
                        },{
                            id: 2,
                            time: "2012-12-12 12:13"
                        },{
                            id: 3,
                            time: "2012-12-12 12:14"
                        }]);

                    compd.items.length.should.eql( 3 );
                });
            });

            it( 'trigger change when nested collection is sorted', function(){
                shouldFireChangeOnce( compd, 'items', function(){
                    compd.items.comparator = 'time';
                    compd.items.sort();
                });
            });

            it( "trigger single change on nested collection's bulk change operation", function(){
                shouldFireChangeOnce( compd, 'items', function(){
                    compd.items.set([{
                        id: 3,
                        time: "2012-12-12 12:12"
                    },{
                        id: 4,
                        time: "2012-12-12 12:13"
                    },{
                        id: 5,
                        time: "2012-12-12 12:14"
                    }]);

                    compd.items.length.should.eql( 3 );
                });
            });

            it( 'trigger single change in case of bulk update', function(){
                shouldFireChangeOnce( compd, 'items', function(){
                    compd.set({
                        items:[{
                            id: 4,
                            time: "2012-12-12 12:12"
                        },{
                            id: 5,
                            time: "2012-12-12 12:13"
                        },{
                            id: 6,
                            time: "2012-12-12 12:14"
                        }],

                        first: {
                            text: 'Hi'
                        },

                        second: {
                            text: 'Lo'
                        }
                    });
                });
            });
        });
    });

    describe( 'automatic event subscription', function(){
        it( 'manage subscriptions automatically', function(){
            var M = Nested.Model.extend({
                defaults:{
                    left: N,
                    right: N
                },

                listening: {
                    left: {
                        'change:number' : function(){

                        }
                    },

                    right: {
                        'change:time change:text' : 'onRight'
                    }
                },

                onRight: function(){

                }
            });
        });
    });

    describe( 'custom properties', function(){
        it( 'generate read-only properties if function specified', function(){
            var M = Nested.Model.extend({
                properties: {
                    a: function(){ return 5; }
                }
            });

            var m = new M();
            m.a.should.eql( 5 );
        });

        it( 'generate custom properties if standard spec provided', function(){

            var M = Nested.Model.extend({
                state: 0,

                properties: {
                    a: {
                        get: function(){ return this.state; },
                        set: function( x ){ this.state = x; return x; }
                    }
                }
            });

            var m = new M();
            m.a = 5;
            m.a.should.eql( 5 );
            m.state.should.eql( 5 );
        });

        it( 'override properties for defaults', function(){
            var M = Nested.Model.extend({
                defaults: {
                    a: 10
                },

                properties: {
                    a: function(){ return 5; }
                }
            });

            var m = new M();

            m.a.should.eql( 5 );

        });
    });

    describe( 'pass options to nested', function(){
        before( function(){
            this.Book = Nested.Model.extend({
                defaults: {
                    title: String,
                    published: Date
                },
                parse: function(){
                    this.parsed = true;
                }
            });
            this.Books = Nested.Collection.extend({
                model: this.Book
            });
            this.Author = Nested.Model.extend({
                defaults: {
                    name: String,
                    biography: this.Book,
                    books: this.Books
                }
            });
       });

        it( 'model with nested model', function(){
            var author = new this.Author({
                name: 'Jules Verne',
                biography: {
                    name: 'My Bio',
                    published: '1990-01-02 13:14:15'
                }
            }, {
                parse: true
            });
            author.biography.parsed.should.be.true;
        });

        it( 'model with nested collection', function(){
            var author = new this.Author({
                name: 'Jules Verne',
                books: [
                    {
                        name: 'Five Weeks in a Balloon',
                        published: '1990-01-02 13:14:15'
                    },
                    {
                        name: 'Around the Moon',
                        published: '1980-01-02 13:14:15'
                    }
                ]
            }, {
                parse: true
            });

            author.books.at(0).parsed.should.be.true;
            author.books.at(1).parsed.should.be.true;
        });
    });

    describe( 'Attributes definition options', function(){
        it( 'must override native properties', function(){
            var M = Nested.Model.extend({
                attributes : {
                    attr : Number.value( 5 ).options({
                        set : function( value ){
                            this.set( 'attr', value * 2 );
                            return value;
                        }
                    })
                }
            });

            var m = new M();
            m.attr.should.eql( 5 );
            m.attr = 4;
            m.attr.should.eql( 8 );

            var M1 = Nested.Model.extend({
                attributes : {
                    attr : Number.value( 5 ).options({
                        set : function( value ){
                            this.set( 'attr', value * 2 );
                            return value;
                        },

                        get : function(){
                            return this.attributes.attr + 1;
                        }
                    })
                }
            });

            var m1 = new M1();
            m1.attr.should.eql( 6 );
            m1.attr = 4;
            m1.attr.should.eql( 9 );
        });
    });

    describe( 'Relations defined by model id references', function(){
        var C = Nested.Collection.extend({
            model : Nested.Model.extend({
                defaults : {
                    name : String
                }
            })
        });

        var models = new C( _.map( [ 1, 2, 3 ], function( id ){
            return {
                id : id,
                name : id
            };
        }));

        describe( 'Model.From', function(){
            var M = Nested.Model.extend({
                defaults : {
                    ref : Nested.Model.From( models )
                }
            });

            var m;

            it( 'should parse references', function(){
                m = new M({ id : 1, ref : 1 }, { parse: true });
                m.ref.name.should.eql( '1' );
            });

            it( 'should accept assignments with models', function(){
                m.ref = models.get( 2 );
                m.ref.name.should.eql( '2' );
            });

            it( 'should be serialized to id', function(){
                var json = m.toJSON();
                json.ref.should.eql( 2 );
            });
        });

        describe( 'Collection.SubsetOf', function(){
            var M = Nested.Model.extend({
                defaults : {
                    refs : Nested.Collection.SubsetOf( models )
                }
            });

            var m;

            it( 'should parse references', function(){
                m = new M({ id : 1, refs : [ 1, 2 ]}, { parse: true });
                m.refs.get( 1 ).name.should.eql( '1' );
                m.refs.get( 2 ).name.should.eql( '2' );
            });

            it( 'should accept assignments with models', function(){
                m.refs = [ models.get( 2 ) ];
                m.refs.first().name.should.eql( '2' );
            });

            it( 'should be serialized to id', function(){
                var json = m.toJSON();
                json.refs.should.eql( [ 2 ] );
            });
        });

        describe( 'Model.Collection type', function(){
            var M, M2, M3;

            it( 'is defined for base Model type', function(){
                Nested.Model.Collection.should.eql( Nested.Collection );
            });

            it( 'is generated for Model subclasses', function(){
                M = Nested.Model.extend({
                    urlBase : '',
                    save : function(){},

                    defaults : {
                        a : 1,
                        b : 2
                    }
                });

                var c = new M.Collection();
                c.create({ a: 7 });
                c.first().b.should.eql( 2 );
            });

            it( 'can be customized by defining Model.collection property', function(){
                M2 = M.extend({
                    defaults : {
                        c : 3
                    },

                    collection : {
                        something : 'useless',
                        initialize : function(){
                            this.create({ c : 0 });
                        }
                    }
                });

                var c = new M2.Collection();
                c.something.should.eql( 'useless' );
                c.first().a.should.eql( 1 );
                c.first().c.should.eql( 0 );
            });

            it( 'is inherited from base Model.Collection', function(){
                M3 = M2.extend({
                    defaults : {
                        d : 8
                    }
                });

                var c = new M3.Collection();
                c.something.should.eql( 'useless' );
                c.first().a.should.eql( 1 );
                c.first().d.should.eql( 8 );
            });
        });
    });

    describe( 'Custom attributes with NestedTypes.options() ', function() {
        var CustomAttribute = Base.options({
            get : sinon.stub(),
            set : sinon.stub()
        });

        var newModelWithCustomAttr = function() {
            var Model = Base.Model.extend({
                defaults : {
                    myAttr : CustomAttribute
                }
            });

            CustomAttribute.get.reset();
            CustomAttribute.set.reset();

            return new Model();
        };


        it('should invoke custom getter on each read', function() {
            var myModel = newModelWithCustomAttr();

            CustomAttribute.get.returns(17);
            myModel.myAttr.should.equal(17);

            CustomAttribute.get.returns(100);
            myModel.myAttr.should.equal(100);

        });


        it('should invoke custom getter on each read when using get() method', function() {
            var myModel = newModelWithCustomAttr();

            CustomAttribute.get.returns(17);
            myModel.get("myAttr").should.equal(17);

            CustomAttribute.get.returns(100);
            myModel.get("myAttr").should.equal(100);
        });



        it('should invoke custom setter when assigning directly', function() {
            var myModel = newModelWithCustomAttr();

            myModel.myAttr = 42;

            CustomAttribute.set.calledWithExactly(42).should.be.true;
        });


        it('should invoke custom setter when assigning with set() method', function() {
            var myModel = newModelWithCustomAttr();

            myModel.set("myAttr", 42);

            CustomAttribute.set.calledWithExactly(42).should.be.true;
        })
    });
});