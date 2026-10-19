error id: file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/assets/CreateAssetRequest.scala:
file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/assets/CreateAssetRequest.scala
empty definition using pc, found symbol in pc: 
empty definition using semanticdb
empty definition using fallback
non-local guesses:
	 -Asset#
	 -scala/Predef.Asset#
offset: 568
uri: file:///C:/Users/SrivasAm/Downloads/AMS/amsbackend/app/src/main/scala/org/example/assets/CreateAssetRequest.scala
text:
```scala
package org.example.assets

import java.time.LocalDate

final case class CreateAssetRequest(
    assetCode: String,
    assetTypeId: Long,
    name: String,
    quantity: Int,
    actualFound: Option[Int] = None,
    costCenter: Option[String] = None,
    assetOwnerId: Option[Long] = None,
    custodianId: Option[Long] = None,
    locationId: Option[Long] = None,
    dateOfChecking: Option[LocalDate] = None,
    taggingStatus: Option[String] = None,
    makeModel: Option[String] = None,
    remarks: Option[String] = None
) {
  def toAsset: Ass@@et =
    Asset(
      id = 0L,
      assetCode = assetCode.trim,
      assetTypeId = assetTypeId,
      name = name.trim,
      quantity = quantity,
      actualFound = actualFound,
      costCenter = costCenter,
      assetOwnerId = assetOwnerId,
      custodianId = custodianId,
      locationId = locationId,
      dateOfChecking = dateOfChecking,
      taggingStatus = taggingStatus,
      makeModel = makeModel,
      remarks = remarks
    )
}
```


#### Short summary: 

empty definition using pc, found symbol in pc: 