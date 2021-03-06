IMPORTANT. There are changes in verion 9.x breaking compatibility with previous versions. Following changes in your code are  required:
- NestedTypes.Attribute({ ... }) -> NestedTypes.options({ ... })
- NestedTypes.Attribute( Type, value ) -> Type.value( value )

See "Attribute options" section for details on new type annotation syntax.

backbone.nestedTypes
====================

NestedTypes is the type system for JavaScript, implemented on top of  Backbone. It solve common architectural problems of Backbone applications, providing simple yet powerful tools to deal with complex nested data structures. Brief feature list:

- Class type
- *Native properties* for Model attributes, Collection, and Class.
- Inline Collection definition syntax for Models.
- Model.defaults inheritance and deep copying.
- Type declarations and automatic type casts for Model attributes.
- Easy handling of Date attributes.
- *Nested models* and collections.
- *One-to-many* and *many-to-many* models relations.
- 'change' event bubbling for nested models and collections.
- Attribute-level control for parse/toJSON and event bubbling.
- Run-time type error detection and logging.

How it feels like
-----------------

It feels much like statically typed programming language. Yet, it's vanilla JavaScript.

```javascript
var User = NestedTypes.Model.extend({
    urlRoot : '/api/users',

    attributes : {
        // Primitive types
        login    : String, // = ""
        email    : String.value( null ), // = null
        loginCount : Number.options({ toJSON : false }) // = 0, not serialized
        active   : Boolean.value( true ), // = true

        created  : Date, // = new Date()

        settings : Settings, // nested model

        // collection of models, received as an array of model ids
        roles    : Role.Collection.SubsetOf( rolesCollection ),
        // reference to model, received as model id.
        office : Office.From( officeCollection )
    }
});

var collection = new User.Collection(); // Collection is already there...
collection.fetch().done( function(){
    var user = collection.first();
    console.log( user.name ); // native properties
    console.log( user.office.name );
    console.log( user.roles.first().name );
});
```

Types are being checked in run-time on assignment, but instead of throwing exceptions it tries to cast values to defined types. For example:

```javascript
    user.login = 1;
    console.assert( user.login === "1" );

    user.active = undefined;
    console.assert( user.active === false );

    user.loginCount = "hjkhjkhfjkhjkfd";
    console.assert( _.isNan( user.loginCount ) );

    user.settings = { timeZone : 180 }; // same as user.settings.set({ timeZone : 180 })
    console.assert( user.settings instanceof Settings );
```

Requirements & Installation
---------------------------

All modern browsers and IE9+ are supported. To install, type

    bower install backbone.nested-types

or

    npm install backbone.nested-types

or just copy 'nestedtypes.js' file to desired location.

NestedTypes is compatible with node.js, CommonJS/AMD (e.g. RequireJS) module loaders, and could be included with plain script tag as well. To include it, use

    var NestedTypes = require( 'nestedtypes');

or

    require([ 'nestedtypes' ], function( NestedTypes ){

or

    <script src="nestedtypes.js" type="text/javascript"></script>


# API Reference
## Basic features
### Model.defaults:
- Models.attributes as an alternative to 'defaults'
- Native properties are created for every entry.
- Entries are inherited from the base Model.defaults/attributes.
- JSON literals will be deep copied upon creation of model.
- defaults/attributes *must* be an object, functions are not supported.
- attributes *must* be declared in defaults/attributes.


```javascript
    var UserInfo = NestedTypes.Model.extend({
        defaults : {
            name : 'test',
        }
    });

    var DetailedUserInfo = UserInfo.extend({
        attributes : { // <- the same as 'defaults', use whatever you like
            login : '',
            roles : [ 'user' ]
        }
    });

    var user = new DetailedUserInfo();

    // user.get( 'name' ) would be undefined in plain Backbone.
    console.assert( user.name === 'test' ); // you still can use 'get', but why...
    user.name = 'admin';

    // In Backbone all models will share the same instance of [ 'user' ] array.
    // So, following line will create a bug. Not in NestedTypes.
    user.roles.push( 'admin' );
```

### Inline collection definition (Model.collection).

By the way, our models from previous example has collections defined already.
```javascript
    var users = new UserInfo.Collection();
    var detailedUsers = new DetailedUserInfo.Collection();
```

Every model definition creates Collection type extending base Model.Collection.  Collection.model and Collection.url properties are taken from model. You could customize collection with a spec in Model.collection, which then will be passed to BaseModel.Collection.extend.

```javascript
var DetailedUserInfo = UserInfo.extend({
    urlBase : '/api/detailed_user/',

    defaults : {
        login : '',
        roles : [ 'user' ]
    },

    collection : {
        initialize : function(){
            this.fetch();
        }
    }
});

/*
    DetailedUserInfo.Collection = UserInfo.Collection.extend({
        url : '/api/detailed_user/',
        model : DetailedUserInfo,

        initialize: function(){
            this.fetch();
        }
    });
*/
```

### Class type, which can be extended and can throw/listen to events.

```javascript
    var A = NestedTypes.Class.extend({
        a : 1,

        initialize : function( options ){
            this.listenTo( options.other, 'event', doSomething )
        },

        doSomething : function(){
            this.trigger( 'something' );
        }
    });

    var B = A.extend({
        b : 2,

        initialize : function( options ){
            A.prototype.initialize.apply( this, arguments );
            this.listenTo( options.another, 'event', doSomething )
        },
    });

    var b = new B( options );
```

### Explicit native properties definition (Model, Class, Collection).

Native properties are generated for model attributes, however, they also can be defined explicitly for Model, Class, Collection with 'properties' specification.

For Model, explicit property will override generated one, and "properties : false" disable defaults native properties generation.

```javascript
    var A = NestedTypes.Model.extend({
        defaults : {
            a : 1,
            b : 2
        },

        properties : {
            c : function(){
                return this.a + this.b;
            },

            ax2 : {
                get : function(){
                    return this.a * 2;
                },

                set : function( value ){
                    this.a = value / 2;
                    return value;
                }
            }
        }
    });

    var a = new A();
    console.assert( a.c === 3 );

    a.ax2 = 4;
    console.assert( a.c === 2 );
```

### Run-time errors

NestedTypes detect four error types in the runtime, which will be logged to console using console.error.

```
[Type error](Model.extend) Property "name" conflicts with base class members.
```
It's forbidden for native properties to override members of the base Model. Since native properties are generated for Model.defaults elements, its also forbidden to have attribute names which are the same as members of the base Model.

```
[Type Error](Model.set) Attribute hash is not an object: ...
```
First argument of Model.set must be either string, or literal object representing attribute hash.

```
[Type Error](Model.set) Attribute "name" has no default value.
```
Attempt to set attribute which is not declared in defaults.

```
[Type Error](Model.defaults) "defaults" must be an object, functions are not supported
```

## Model.defaults Type Specs
### Basic type annotation syntax and rules

Type specs can be optionally used instead of init values in Model.defaults. They looks like this:

    name : Constructor

or

    name : Constructor.value( x )

where Constructor is JS constructor function, and x is its default value.

When default value is not specified, typed attribute is initialized invoking 'new Constructor()'.

As a general rule, when typed attribute is assigned with the value...
- which is null, attribute will be set to null.
- which is an instance of Constructor, attribute's value will be replaced.
- in other case, NestedTypes will try to convert value to the Constructor type, typically invoking "new Constructor( value )". This type conversion algorithm may be overriden for some selected types.

When receiving data from server, type cast logic is used to parse JSON responce; typically you don't need to override Model.parse.

When sending data to the server, Constructor.toJSON will be invoked to produce JSON for typed attributes, so you don't need to override Model.toJSON for that.

```javascript
var A = NestedTypes.Model.extend({
    defaults : {
        obj1 : Ctor, // = new Ctor()
        obj2 : Ctor.value( null ), // = null
        obj3 : Ctor.value( something ), // = new Ctor( something )
    }
});

var a = A();

a.obj2 = "dsds"; // a.obj2 = new Ctor( "dsds" );

console.assert( a.obj2 instanceof Ctor );
```

### Primitive types (Boolean, Number, String)

Primitive types are special in a sense that *they are infered from their values*, so they are always typed. In most cases special type annotation syntax is not really required.

It means that if attribute has default value of 5 *then it's guaranteed to be Number or null* (it will be casted to Number on assignments). This is quite different from original Backbone's behaviour which you might expect, and it makes models safer. For polimorphic attributes holding different types you can disable type inference using 'NestedTypes.value'.

```javascript
var A = NestedTypes.Model.extend({
    defaults : {
        // Original backbone behaviour - no type, value is 3232
        untyped : NestedTypes.value( 3232 )

        // defaults with primitive types are always 'typed'
        number  : 5,           // same as Number.value( 5 )
        string  : 'something', // same as String.value( 'something' )
        string1 : '',          // same as String
        boolean : true,        // same as Boolean.value( true )

        initWithNull  : String.value( null ), // Type is String, default value is null
    }
});

var a = A();

a.boolean = "hello";
console.assert( a.boolean === true );

a.number = "5";
console.assert( a.number === 5 );

a.number = "hjhjfd";
console.assert( _.isNaN( a.number ) );

a.string = 5;
console.assert( a.string === "5" );

a.boolean = 0;
console.assert( a.boolean === false );
```

### Date type
- Automatic parsing of common JSON date representations.
- Automatically serialized to ISO string (don't need to override toJSON)

Date attributes free you from overriding Model.parse or Model.toJSON when you want to transfer dates between server and client.

Strings and numbers will be converted to date with Date constructor. NestedTypes contains additional logic to implement cross-browser ISO date parsing and handling of MS date format.

On serialization, Date.toJSON will be invoked for date attribute, producing UTC-0 ISO date string representation.

```javascript
var A = NestedTypes.Model.extend({
    defaults : {
        created : Date, // = new Date()
        updated : Date.value( null ), // = null
        a : Date.value( 327943789 ), //  = new Date( 327943789 )
        b : Date.value( "2012-12-12 12:12" ) //  = new Date( "2012-12-12 12:12" )
    }
});

var a = A();

a.updated = '2012-12-12 12:12';
console.assert( a.updated instanceof Date );

a.updated = '/Date(32323232323)/';
console.assert( a.updated instanceof Date );
```

### Nested Models and Collections
- automatic parsing and serialization
- 'deep updates' and 'deep clone'
- 'change' event bubbling

To define nested model or collection, just annotate attributes with Model or Collection type.

Note, that Backbone's .clone() method will create shallow copy of the root model, while Model.deepClone() and Collection.deepClone() will clone model and collection with all subitems.

```javascript
var User = NestedTypes.Model.extend({
    defaults : {
        name        : String,
        created     : Date,
        group       : GroupModel,
        permissions : PermissionCollection
    }
});

var a = new User(),
    b = a.deepClone();
```

Model/Collection type cast behavior depends on attribute value before assignment:
- If attribute value is null, Model/Collection constructor will be invoked as for usual types.
- If attribute already holds model or collection, *deep update* will be performed instead.

"Deep update" means that model/collection object itself will remain in place, and 'set' method will be used to perform an update.

I.e. this code:

```javascript
var user = new User();
user.group = {
    name: "Admin"
};

user.permissions = [{ id: 5, type: 'full' }];
```

is equivalent of:

```javascript
user.group.set({
   name: "Admin"
};

user.permissions.set( [{ id: 5, type: 'full' }] );
```

This mechanics of 'set' allows you to work with JSON from in case of deeply nested models and collections without the need to override 'parse'. This code (considering that nested attributes defined as models):

```javascript
user.group = {
    nestedModel : {
        deeplyNestedModel : {
            attr : 'value'
        },

        attr : 5
    }
};
```

is almost equivalent of:

```javascript
user.group.nestedModel.deeplyNestedModel.set( 'attr', 'value' );
user.group.nestedModel.set( 'attr', 'value' );
```

but it will fire just single `change` event.

Change events will be bubbled from nested models and collections.
- `change` and `change:attribute` events for any changes in nested models and collections. Multiple `change` events from submodels during bulk updates are carefully joined together, which make it suitable to subscribe View.render to the top model's `change`.
- `replace:attribute` event when model or collection is replaced with new object. You might need it to subscribe for events from submodels.
- It's possible to control event bubbling for every attribute. You can completely disable it, or override the list of events which would be counted as change:

```javascript
var M = NestedTypes.Model.extend({
	defaults: {
		bubbleChanges : ModelOrCollection,

		dontBubble : ModelOrCollection.options({ triggerWhanChanged : false })
		}),

		bubbleCustomEvents : ModelOrCollection.options({
            triggerWhanChanged : 'event1 event2 whatever'
		}),
	}
});
```

### Model relations
- Model.From
- Collection.SubsetOf

Sometimes when you have one-to-many and many-to-many relationships between Models, it is suitable to transfer such a relationships from server as arrays of model ids. NestedTypes gives you special attribute data types for this situation.

```javascript
var User = NestedTypes.Model.extend({
    defaults : {
        name : String,
        roles : RolesCollection.SubsetOf( rolesCollection ) // <- serialized as array of model ids
        location : Location.From( locationsCollection ) // <- serialized as model id
    }
});

var user = new User({ id: 0 });
user.fetch(); // <- you'll receive from server "{ id: 0, name : 'john', roles : [ 1, 2, 3 ] }"
...
// however, user.roles behaves like normal collection of Roles.
assert( user.roles instanceof Collection );
assert( user.roles.first() instanceof Role );
```

Collection.SubsetOf is a collection of models taken from existing collection. On first access of attribute of this type, it will resolve ids to real models from the given master collection.

If master collection is empty and thus references cannot be resolved, it will defer id resolution and just return collection of dummy models with ids. However, if master collection is not empty, it will filter out ids of non-existent models.

There are 'lazy' option for passing reference to master collection:

```javascript
var User = NestedTypes.Model.extend({
    defaults : {
        name : String,
        roles : Collection.RefsTo( function(){
            return this.collection.rolesCollection; // <- collection of Roles is the direct member of Users.Collection
        }),
        location : Location.From( function(){
            return this.collection.locationsCollection; // <- collection of Roles is the direct member of Users.Collection
        })
    }
});
```

Note, that 'change' events won't be bubbled from models in Collection.SubsetOf. Other collection's events will.

For Model.From attribute no model changes will be bubbled.

### Attribute options
- type and value
- override native property
- override parse/toJSON

Attribute options spec allow for a full control on the attribute options, including 'type' and 'value'. Attribute type specification is the special case of options spec, which, in its most general form, looks like this:

    NestedTypes.options({ ... })

The relation between short and long forms of attribute options spec is summarized in the table below:

 Short form              | Long form
-------------------------|-------
 Type                    | NestedTypes.options({ type : Type })
 Type.options({ ... })   | NestedTypes.options({ type : Type, ... })
 NestedTypes.value( x )  | NestedTypes.options({ value : x })
 Type.value( x )         | NestedTypes.options({ type : Type, value: x })


Both long and short forms of attribute options are chainable. I.e. following constructs are possible:

    Type.value( x ).options({ ... }) // same as NestedTypes.options({ type : Type, value : x, ... })
    NestedTypes.value( x ).options({ ... }) // = NestedTypes.options({ value : x, ... })
    NestedTypes.options({ ... }).value( x ) // = NestedTypes.options({ value : x, ... })
    ...

Available options so far are:

Option      | Description
------------|-----------
type : Ctor | attribute's type (constructor function)
value : x   | attribute's default value
toJSON : false | attribute will not be serialized to JSON
toJSON : function( attrValue, attrName ) -> JSON | serialize attribute to JSON with the given function
parse  : function( data ) -> {attribute hash} | parse attribute with a given function
get : function() -> value | override native property getter for the attribute
set : function( value ) -> value | to override native property setter for the attribute
triggerWhenChanged : String | bubble 'change' event when given list of events are triggered by the attribute
triggerWhenChanged : false  | don't bubble 'change' events from the the attribute
